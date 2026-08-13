<?php

namespace App\Services;

use App\Enums\MovementType;
use App\Exceptions\InsufficientStockException;
use App\Models\Batch;
use App\Models\Medicine;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockMovement;
use App\Models\Store;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class SaleService
{
    /**
     * Process a multi-line sale atomically.
     *
     * Each line: ['medicine_id' => int, 'quantity' => int,
     *             'batch_id' => ?int (manual override, e.g. returns/edge cases),
     *             'unit_price' => ?float (price override)]
     *
     * Default path is FEFO: the batch with the earliest expiry_date is
     * auto-selected (splitting across batches when the earliest cannot cover
     * the full quantity), so the cashier never has to pick a batch.
     *
     * The whole operation runs in one DB transaction with lockForUpdate() on
     * the batches being sold from, so two simultaneous sales cannot oversell.
     *
     * @param  array<int, array{medicine_id: int, quantity: int, batch_id?: int|null, unit_price?: float|null}>  $lines
     * @param  array{customer_name?: ?string, customer_tin?: ?string, customer_sno?: ?string, receiver_name?: ?string, reference?: ?string, payment_method?: string, discount_amount?: float, tax_amount?: float}  $meta
     *
     * @throws InsufficientStockException
     */
    public function process(User $user, array $lines, array $meta = []): Sale
    {
        return DB::transaction(function () use ($user, $lines, $meta): Sale {
            // Serialize invoice numbering per store by locking the store row.
            $store = Store::query()->whereKey($user->store_id)->lockForUpdate()->firstOrFail();

            $allocations = [];

            foreach ($lines as $line) {
                $medicine = Medicine::query()->findOrFail($line['medicine_id']);
                $quantity = (int) $line['quantity'];
                $unitPrice = isset($line['unit_price']) && $line['unit_price'] !== null
                    ? round((float) $line['unit_price'], 2)
                    : (float) $medicine->default_price;

                foreach ($this->allocateBatches($medicine, $quantity, $line['batch_id'] ?? null) as [$batch, $taken]) {
                    $allocations[] = [
                        'medicine' => $medicine,
                        'batch' => $batch,
                        'quantity' => $taken,
                        'unit_price' => $unitPrice,
                    ];
                }
            }

            $subtotal = round(array_sum(array_map(
                fn (array $a): float => $a['quantity'] * $a['unit_price'],
                $allocations,
            )), 2);
            $taxAmount = round((float) ($meta['tax_amount'] ?? 0), 2);
            $discountAmount = round((float) ($meta['discount_amount'] ?? 0), 2);

            $sale = Sale::query()->create([
                'store_id' => $store->id,
                'user_id' => $user->id,
                'invoice_no' => $this->nextInvoiceNumber($store),
                'customer_name' => $meta['customer_name'] ?? null,
                'customer_tin' => $meta['customer_tin'] ?? null,
                'customer_sno' => $meta['customer_sno'] ?? null,
                'receiver_name' => $meta['receiver_name'] ?? null,
                'reference' => $meta['reference'] ?? null,
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'discount_amount' => $discountAmount,
                'total_amount' => round($subtotal + $taxAmount - $discountAmount, 2),
                'payment_method' => $meta['payment_method'] ?? 'cash',
            ]);

            foreach ($allocations as $allocation) {
                SaleItem::query()->create([
                    'sale_id' => $sale->id,
                    'batch_id' => $allocation['batch']->id,
                    'medicine_id' => $allocation['medicine']->id,
                    'quantity' => $allocation['quantity'],
                    'unit_price' => $allocation['unit_price'],
                    'total_price' => round($allocation['quantity'] * $allocation['unit_price'], 2),
                ]);

                $allocation['batch']->decrement('quantity', $allocation['quantity']);

                StockMovement::query()->create([
                    'store_id' => $store->id,
                    'batch_id' => $allocation['batch']->id,
                    'type' => MovementType::Out,
                    'quantity' => -$allocation['quantity'],
                    'reference_type' => Sale::class,
                    'reference_id' => $sale->id,
                    'user_id' => $user->id,
                ]);
            }

            return $sale->load('items.medicine', 'items.batch');
        });
    }

    /**
     * Lock and allocate stock for one line.
     *
     * @return array<int, array{0: Batch, 1: int}> [batch, quantityTaken] pairs
     *
     * @throws InsufficientStockException
     */
    private function allocateBatches(Medicine $medicine, int $quantity, ?int $batchId): array
    {
        if ($batchId !== null) {
            // Manual override: sell from exactly the chosen batch.
            $batch = Batch::query()
                ->whereKey($batchId)
                ->where('medicine_id', $medicine->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($batch->quantity < $quantity) {
                throw new InsufficientStockException($medicine->name, $quantity, $batch->quantity);
            }

            return [[$batch, $quantity]];
        }

        // FEFO: earliest expiry first among non-expired batches with stock.
        $batches = Batch::query()
            ->where('medicine_id', $medicine->id)
            ->where('quantity', '>', 0)
            ->whereDate('expiry_date', '>=', now()->toDateString())
            ->orderBy('expiry_date')
            ->orderBy('id')
            ->lockForUpdate()
            ->get();

        if ($batches->sum('quantity') < $quantity) {
            throw new InsufficientStockException($medicine->name, $quantity, (int) $batches->sum('quantity'));
        }

        $allocations = [];
        $remaining = $quantity;

        foreach ($batches as $batch) {
            $take = min($batch->quantity, $remaining);
            $allocations[] = [$batch, $take];
            $remaining -= $take;

            if ($remaining === 0) {
                break;
            }
        }

        return $allocations;
    }

    /**
     * Per-store daily sequence, e.g. INV-20260813-0004. Safe against races
     * because the caller holds a lock on the store row.
     */
    private function nextInvoiceNumber(Store $store): string
    {
        $today = now()->toDateString();

        $countToday = Sale::query()
            ->withoutGlobalScopes()
            ->where('store_id', $store->id)
            ->whereDate('created_at', $today)
            ->count();

        return sprintf('INV-%s-%04d', now()->format('Ymd'), $countToday + 1);
    }
}
