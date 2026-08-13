<?php

namespace App\Console\Commands;

use App\Enums\MedicineUnit;
use App\Enums\UserRole;
use App\Models\Batch;
use App\Models\Category;
use App\Models\Medicine;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Store;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * One-off migration of the legacy Express/PostgreSQL data into the new
 * schema, inserting through Eloquent models so data is validated/cleaned
 * in transit (no raw dump/restore).
 *
 * Legacy model:  users / categories / inventory (flat batch table) /
 *                sales (one row per line item).
 * New model:     users / categories / medicines + batches /
 *                sales (header) + sale_items.
 */
class MigrateLegacyData extends Command
{
    protected $signature = 'legacy:migrate
        {--store-slug=hawan-drug-store : Slug of the target store (created if missing)}
        {--store-name=Hawan Drug Store : Name used when the store must be created}
        {--email-domain=hawan.local : Domain used to synthesize emails from legacy usernames}
        {--verify-email= : Legacy username whose password should be verified after import}
        {--verify-password= : Known-good plaintext password for --verify-email}';

    protected $description = 'Import users, categories, inventory and sales from the legacy PostgreSQL database';

    /** @var array<int, int> legacy user id => new user id */
    private array $userMap = [];

    /** @var array<int, int> legacy category id => new category id */
    private array $categoryMap = [];

    /** @var array<int, int> legacy inventory id => new batch id */
    private array $batchMap = [];

    /** @var array<string, Medicine> lower(name) => Medicine */
    private array $medicineByName = [];

    private Store $store;

    public function handle(): int
    {
        $legacy = DB::connection('legacy_pgsql');

        try {
            $legacy->select('select 1');
        } catch (\Throwable $e) {
            $this->error('Cannot reach the legacy PostgreSQL database: '.$e->getMessage());
            $this->line('Configure LEGACY_DATABASE_URL (or LEGACY_PG* variables) in .env first.');

            return self::FAILURE;
        }

        $this->store = Store::query()->firstOrCreate(
            ['slug' => $this->option('store-slug')],
            ['name' => $this->option('store-name')],
        );
        $this->info("Target store: {$this->store->name} (#{$this->store->id})");

        DB::transaction(function () use ($legacy): void {
            $this->migrateUsers($legacy);
            $this->migrateCategories($legacy);
            $this->migrateInventory($legacy);
            $this->migrateSales($legacy);
        });

        $this->verifyPasswordSample();

        $this->newLine();
        $this->info('Legacy data migration finished. Now run: php artisan legacy:reconcile');

        return self::SUCCESS;
    }

    private function migrateUsers($legacy): void
    {
        $rows = $legacy->select('select id, username, password, role from users order by id');
        $domain = $this->option('email-domain');
        $created = 0;
        $needReset = [];

        foreach ($rows as $row) {
            $email = Str::lower(trim($row->username)).'@'.$domain;
            $isBcrypt = (bool) preg_match('/^\$2[aby]\$/', (string) $row->password);

            // Preserve bcrypt hashes as-is (Laravel verifies them natively).
            // Legacy plaintext passwords are NOT carried over: those users get
            // an unusable random password and must reset via "Forgot password".
            $password = $isBcrypt ? $row->password : Hash::make(Str::random(40));

            if (! $isBcrypt) {
                $needReset[] = $row->username;
            }

            $user = User::query()->firstOrCreate(
                ['store_id' => $this->store->id, 'email' => $email],
                [
                    'name' => $row->username,
                    'password' => $password,
                    'role' => $row->role === 'admin' ? UserRole::Admin : UserRole::Staff,
                    'email_verified_at' => now(),
                ],
            );

            $this->userMap[(int) $row->id] = $user->id;
            $created++;
        }

        $this->info("Users: {$created} migrated (login email = <username>@{$domain}).");

        if ($needReset !== []) {
            $this->warn('Password reset required (legacy plaintext rows): '.implode(', ', $needReset));
        }
    }

    private function migrateCategories($legacy): void
    {
        $rows = $legacy->select('select id, category_name from categories order by id');

        foreach ($rows as $row) {
            $category = Category::withoutGlobalScopes()->firstOrCreate([
                'store_id' => $this->store->id,
                'name' => trim($row->category_name),
            ]);

            $this->categoryMap[(int) $row->id] = $category->id;
        }

        $this->info('Categories: '.count($rows).' migrated.');
    }

    private function migrateInventory($legacy): void
    {
        $count = 0;

        // Legacy "inventory" is a flat batch table: one medicine may appear on
        // several rows (one per batch). Distinct names become medicines; every
        // row becomes a batch of that medicine.
        $legacy->table('inventory')->orderBy('id')->chunk(500, function ($rows) use (&$count): void {
            foreach ($rows as $row) {
                $medicine = $this->resolveMedicine(
                    name: trim((string) $row->name),
                    categoryId: isset($row->category_id) ? $this->categoryMap[(int) $row->category_id] ?? null : null,
                    unit: MedicineUnit::fromLegacy($row->unit ?? null),
                    price: (float) ($row->price_per_unit ?? 0),
                );

                $batchNumber = trim((string) $row->batch_number) ?: 'LEGACY-'.$row->id;

                // Legacy uniqueness was app-enforced; guard against dupes.
                if (Batch::withoutGlobalScopes()
                    ->where('store_id', $this->store->id)
                    ->where('batch_number', $batchNumber)
                    ->exists()) {
                    $batchNumber .= '-'.$row->id;
                }

                $batch = Batch::query()->create([
                    'store_id' => $this->store->id,
                    'medicine_id' => $medicine->id,
                    'batch_number' => $batchNumber,
                    'quantity' => max(0, (int) $row->quantity),
                    'initial_quantity' => max(0, (int) ($row->initial_batch_quantity ?? $row->quantity)),
                    'unit_cost' => 0, // Purchase cost was never tracked in the legacy system.
                    'expiry_date' => $row->expiry_date ?? now()->toDateString(),
                ]);

                $this->batchMap[(int) $row->id] = $batch->id;
                $count++;
            }
        });

        $this->info("Inventory: {$count} batches across ".count($this->medicineByName).' medicines migrated.');
    }

    private function migrateSales($legacy): void
    {
        $fallbackUserId = $this->userMap !== []
            ? reset($this->userMap)
            : User::withoutGlobalScopes()->where('store_id', $this->store->id)->value('id');

        // Legacy sales are one row per line item; rows sharing a non-empty
        // invoice_no on the same day for the same customer form one invoice.
        $groups = [];
        foreach ($legacy->table('sales')->orderBy('sale_date')->orderBy('id')->get() as $row) {
            $invoice = trim((string) $row->invoice_no);
            $key = $invoice !== ''
                ? $invoice.'|'.substr((string) $row->sale_date, 0, 10).'|'.$row->customer_name
                : 'single-row|'.$row->id;
            $groups[$key][] = $row;
        }

        $saleCount = 0;
        $itemCount = 0;
        $legacySeq = 0;

        foreach ($groups as $rows) {
            $first = $rows[0];
            $subtotal = round(array_sum(array_map(fn ($r) => (float) $r->total_price, $rows)), 2);
            $invoice = trim((string) $first->invoice_no) ?: sprintf('INV-LEGACY-%06d', ++$legacySeq);

            $sale = new Sale([
                'store_id' => $this->store->id,
                'user_id' => $this->userMap[(int) $first->user_id] ?? $fallbackUserId,
                'invoice_no' => $invoice,
                'customer_name' => trim((string) $first->customer_name) ?: null,
                'customer_tin' => trim((string) $first->customer_tin) ?: null,
                'customer_sno' => trim((string) $first->customer_sno) ?: null,
                'receiver_name' => trim((string) $first->receiver_name) ?: null,
                'reference' => trim((string) $first->reference) ?: null,
                'subtotal' => $subtotal,
                'tax_amount' => 0,
                'discount_amount' => 0,
                'total_amount' => $subtotal,
                'payment_method' => in_array($first->payment_method, ['cash', 'credit'], true) ? $first->payment_method : 'cash',
                'sync_status' => 'synced',
            ]);
            $sale->created_at = $first->sale_date;
            $sale->updated_at = $first->sale_date;
            $sale->save();

            foreach ($rows as $row) {
                SaleItem::query()->create([
                    'sale_id' => $sale->id,
                    'batch_id' => $this->batchMap[(int) $row->batch_id] ?? $this->purgedBatchId(),
                    'medicine_id' => $this->resolveMedicine(
                        name: trim((string) $row->medicine_name) ?: 'Purged Item',
                        categoryId: null,
                        unit: MedicineUnit::Piece,
                        price: (float) $row->unit_price,
                    )->id,
                    'quantity' => max(1, (int) $row->quantity_sold),
                    'unit_price' => (float) $row->unit_price,
                    'total_price' => (float) $row->total_price,
                ]);
                $itemCount++;
            }

            $saleCount++;
        }

        $this->info("Sales: {$saleCount} invoices / {$itemCount} line items migrated.");
    }

    private function resolveMedicine(string $name, ?int $categoryId, MedicineUnit $unit, float $price): Medicine
    {
        $key = Str::lower($name);

        if (! isset($this->medicineByName[$key])) {
            $this->medicineByName[$key] = Medicine::withoutGlobalScopes()->firstOrCreate(
                ['store_id' => $this->store->id, 'name' => $name],
                [
                    'category_id' => $categoryId,
                    'unit' => $unit,
                    'default_price' => $price,
                    'reorder_level' => 10,
                ],
            );
        }

        return $this->medicineByName[$key];
    }

    /**
     * Batch placeholder for legacy sales whose inventory row was hard-deleted
     * ("Purged Item" in the old reports). Keeps FK integrity intact.
     */
    private function purgedBatchId(): int
    {
        $medicine = $this->resolveMedicine('Purged Item', null, MedicineUnit::Piece, 0);

        $batch = Batch::withoutGlobalScopes()
            ->where('store_id', $this->store->id)
            ->where('batch_number', 'LEGACY-PURGED')
            ->first() ?? Batch::query()->create([
                'store_id' => $this->store->id,
                'medicine_id' => $medicine->id,
                'batch_number' => 'LEGACY-PURGED',
                'quantity' => 0,
                'initial_quantity' => 0,
                'unit_cost' => 0,
                'expiry_date' => now()->toDateString(),
            ]);

        return $batch->id;
    }

    private function verifyPasswordSample(): void
    {
        $username = $this->option('verify-email');
        $password = $this->option('verify-password');

        if (! $username || ! $password) {
            $this->warn('Tip: pass --verify-email=<legacy username> --verify-password=<known password> to confirm bcrypt hashes transferred correctly.');

            return;
        }

        $email = Str::lower(trim($username)).'@'.$this->option('email-domain');
        $user = User::withoutGlobalScopes()
            ->where('store_id', $this->store->id)
            ->where('email', $email)
            ->first();

        if ($user === null) {
            $this->error("Verification account {$email} not found.");

            return;
        }

        if (Hash::check($password, $user->password)) {
            $this->info("Password verification PASSED for {$email} — bcrypt hashes are compatible.");
        } else {
            $this->error("Password verification FAILED for {$email} — force password resets before cut-over.");
        }
    }
}
