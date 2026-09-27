<?php

namespace App\Http\Controllers;

use App\Exceptions\InsufficientStockException;
use App\Http\Requests\StoreSaleRequest;
use App\Models\Medicine;
use App\Services\SaleService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SaleController extends Controller
{
    /**
     * Sell-Out (POS) page. Medicine search results arrive as Inertia props
     * driven by the ?search= query string (partial reloads from the cart).
     */
    public function create(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));

        $medicines = [];

        if ($search !== '') {
            $like = '%'.mb_strtolower($search).'%';

            $medicines = Medicine::query()
                ->with(['sellableBatches' => fn ($q) => $q->whereDate('expiry_date', '>=', now()->toDateString())])
                ->where(function ($query) use ($like) {
                    $query->whereRaw('lower(name) like ?', [$like])
                        ->orWhereRaw('lower(generic_name) like ?', [$like])
                        ->orWhereHas('batches', fn ($b) => $b->whereRaw('lower(batch_number) like ?', [$like]));
                })
                ->orderBy('name')
                ->limit(25)
                ->get()
                ->map(fn (Medicine $medicine): array => [
                    'id' => $medicine->id,
                    'name' => $medicine->name,
                    'generic_name' => $medicine->generic_name,
                    'unit' => $medicine->unit->value,
                    'price' => (float) $medicine->default_price,
                    'available_stock' => (int) $medicine->sellableBatches->sum('quantity'),
                    // FEFO order: first entry is the auto-selected batch;
                    // the rest are shown only in the manual override picker.
                    'batches' => $medicine->sellableBatches->map(fn ($batch): array => [
                        'id' => $batch->id,
                        'batch_number' => $batch->batch_number,
                        'quantity' => $batch->quantity,
                        'expiry_date' => $batch->expiry_date->toDateString(),
                    ])->values(),
                ]);
        }

        return Inertia::render('sell-out', [
            'results' => $medicines,
            'search' => $search,
            'fieldConfigs' => fn () => \App\Models\SellOutFieldConfig::where('store_id', $request->user()->store_id)
                ->where('is_active', true)
                ->orderBy('section')
                ->orderBy('sort_order')
                ->get()
                ->groupBy('section'),
        ]);
    }

    /**
     * Record a sale: sale + sale_items + batch decrements + stock_movements,
     * all inside one transaction with row locks (see SaleService).
     */
    public function store(StoreSaleRequest $request, SaleService $saleService): RedirectResponse
    {
        try {
            $sale = $saleService->process(
                $request->user(),
                $request->validated('items'),
                $request->safe()->except('items'),
            );
        } catch (InsufficientStockException $e) {
            throw ValidationException::withMessages(['items' => $e->getMessage()]);
        }

        return back()->with('receipt', [
            'id' => $sale->id,
            'invoice_no' => $sale->invoice_no,
            'created_at' => $sale->created_at->toIso8601String(),
            'customer_name' => $sale->customer_name,
            'customer_tin' => $sale->customer_tin,
            'customer_sno' => $sale->customer_sno,
            'receiver_name' => $sale->receiver_name,
            'reference' => $sale->reference,
            'payment_method' => $sale->payment_method->value,
            'seller_name' => $sale->seller_name ?: $request->user()->name,
            'subtotal' => (float) $sale->subtotal,
            'tax_amount' => (float) $sale->tax_amount,
            'discount_amount' => (float) $sale->discount_amount,
            'total_amount' => (float) $sale->total_amount,
            'items' => $sale->items->map(fn ($item): array => [
                'medicine_name' => $item->medicine->name,
                'batch_number' => $item->batch->batch_number,
                'unit' => $item->medicine->unit->value,
                'quantity' => $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'total_price' => (float) $item->total_price,
                'expiry_date' => $item->batch->expiry_date->toDateString(),
            ])->values(),
        ]);
    }
}
