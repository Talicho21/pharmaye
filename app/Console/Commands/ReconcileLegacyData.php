<?php

namespace App\Console\Commands;

use App\Models\Store;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Post-migration reconciliation: compares row counts and sum totals between
 * the legacy PostgreSQL data and the new MySQL data. The data migration is
 * not complete until every row of this report matches.
 */
class ReconcileLegacyData extends Command
{
    protected $signature = 'legacy:reconcile
        {--store-slug=hawan-drug-store : Slug of the store that received the legacy data}';

    protected $description = 'Compare row counts and financial totals between the legacy PostgreSQL and new MySQL data';

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

        $store = Store::query()->where('slug', $this->option('store-slug'))->first();

        if ($store === null) {
            $this->error("Store '{$this->option('store-slug')}' not found. Run legacy:migrate first.");

            return self::FAILURE;
        }

        $storeId = $store->id;

        $checks = [
            [
                'metric' => 'Users',
                'legacy' => (int) $legacy->table('users')->count(),
                'new' => (int) DB::table('users')->where('store_id', $storeId)->count(),
            ],
            [
                'metric' => 'Categories',
                'legacy' => (int) $legacy->table('categories')->count(),
                'new' => (int) DB::table('categories')->where('store_id', $storeId)->count(),
            ],
            [
                'metric' => 'Inventory rows -> batches',
                'legacy' => (int) $legacy->table('inventory')->count(),
                // LEGACY-PURGED is a placeholder we add, not legacy data.
                'new' => (int) DB::table('batches')->where('store_id', $storeId)->where('batch_number', '!=', 'LEGACY-PURGED')->count(),
            ],
            [
                'metric' => 'Stock units on hand',
                'legacy' => (int) $legacy->table('inventory')->sum('quantity'),
                'new' => (int) DB::table('batches')->where('store_id', $storeId)->sum('quantity'),
            ],
            [
                'metric' => 'Inventory value (qty x price)',
                'legacy' => round((float) $legacy->selectOne(
                    'select coalesce(sum(quantity * price_per_unit), 0) as v from inventory'
                )->v, 2),
                'new' => round((float) DB::selectOne(
                    'select coalesce(sum(b.quantity * m.default_price), 0) as v
                     from batches b join medicines m on m.id = b.medicine_id
                     where b.store_id = ?',
                    [$storeId],
                )->v, 2),
            ],
            [
                'metric' => 'Sales line items',
                'legacy' => (int) $legacy->table('sales')->count(),
                'new' => (int) DB::table('sale_items')
                    ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
                    ->where('sales.store_id', $storeId)
                    ->count(),
            ],
            [
                'metric' => 'Historical sales revenue',
                'legacy' => round((float) $legacy->selectOne(
                    'select coalesce(sum(total_price), 0) as v from sales'
                )->v, 2),
                'new' => round((float) DB::table('sales')->where('store_id', $storeId)->sum('total_amount'), 2),
            ],
            [
                'metric' => 'Items sold (all time)',
                'legacy' => (int) $legacy->table('sales')->sum('quantity_sold'),
                'new' => (int) DB::table('sale_items')
                    ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
                    ->where('sales.store_id', $storeId)
                    ->sum('sale_items.quantity'),
            ],
        ];

        $rows = [];
        $allMatch = true;

        foreach ($checks as $check) {
            $match = $check['legacy'] == $check['new'];
            $allMatch = $allMatch && $match;
            $rows[] = [$check['metric'], $check['legacy'], $check['new'], $match ? 'OK' : 'MISMATCH'];
        }

        $this->table(['Metric', 'Legacy (Postgres)', 'New (MySQL)', 'Status'], $rows);

        if ($allMatch) {
            $this->info('Reconciliation PASSED — legacy and new data agree.');

            return self::SUCCESS;
        }

        $this->error('Reconciliation FAILED — investigate the mismatched rows before decommissioning the old system.');

        return self::FAILURE;
    }
}
