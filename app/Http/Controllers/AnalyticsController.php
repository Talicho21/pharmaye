<?php

namespace App\Http\Controllers;

use App\Models\Batch;
use App\Models\Sale;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Reports & analytics. The legacy Postgres raw queries (INTERVAL '…',
 * ILIKE, ::date casts, EXTRACT, NULLS FIRST) are re-expressed here as
 * driver-portable Eloquent/query-builder aggregations.
 */
class AnalyticsController extends Controller
{
    public function index(Request $request): Response
    {
        $range = in_array($request->query('range'), ['24h', 'monthly', '6months', 'yearly'], true)
            ? $request->query('range')
            : 'monthly';

        $endDate = $this->parseDate($request->query('endDate')) ?? now()->endOfDay();
        $startDate = $this->parseDate($request->query('startDate')) ?? now()->subDays(29)->startOfDay();
        $search = trim((string) $request->query('search', ''));
        $expiryStatus = $this->parseExpiryStatus($request->query('expiryStatus'));

        return Inertia::render('reports', [
            'range' => $range,
            'overview' => $this->overview($range),
            'topSelling' => $this->topSelling($range),
            'salesLog' => $this->salesLog($startDate, $endDate->endOfDay(), $search),
            'expiryHealth' => $this->expiryHealth($expiryStatus),
            'filters' => [
                'startDate' => $startDate->toDateString(),
                'endDate' => $endDate->toDateString(),
                'search' => $search,
            ],
        ]);
    }

    private function rangeStart(string $range): Carbon
    {
        return match ($range) {
            '24h' => now()->subDay(),
            '6months' => now()->subMonths(6),
            'yearly' => now()->subYear(),
            default => now()->subDays(30),
        };
    }

    /**
     * Legacy: SELECT SUM(total_price), SUM(quantity_sold) FROM sales
     *         WHERE sale_date >= NOW() - INTERVAL '…'
     */
    private function overview(string $range): array
    {
        $from = $this->rangeStart($range);

        $revenue = (float) Sale::query()
            ->where('created_at', '>=', $from)
            ->sum('total_amount');

        $itemsSold = (int) Sale::query()
            ->join('sale_items', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.created_at', '>=', $from)
            ->sum('sale_items.quantity');

        return [
            'totalRevenue' => $revenue,
            'totalItemsSold' => $itemsSold,
            'salesCount' => Sale::query()->where('created_at', '>=', $from)->count(),
        ];
    }

    /**
     * Legacy: top 5 by quantity via GROUP BY COALESCE(medicine_name, …).
     * Soft-deleted medicines still resolve thanks to withTrashed().
     */
    private function topSelling(string $range): array
    {
        $from = $this->rangeStart($range);

        return Sale::query()
            ->join('sale_items', 'sale_items.sale_id', '=', 'sales.id')
            ->join('medicines', fn ($join) => $join->on('medicines.id', '=', 'sale_items.medicine_id'))
            ->where('sales.created_at', '>=', $from)
            ->groupBy('medicines.id', 'medicines.name')
            ->orderByRaw('sum(sale_items.quantity) desc')
            ->limit(5)
            ->selectRaw('medicines.name as medicine_name, sum(sale_items.quantity) as quantity_sold, sum(sale_items.total_price) as total_revenue')
            ->get()
            ->map(fn ($row): array => [
                'medicineName' => $row->medicine_name,
                'quantitySold' => (int) $row->quantity_sold,
                'totalRevenue' => (float) $row->total_revenue,
            ])
            ->all();
    }

    /**
     * Legacy sales-log ledger: date-range + free-text search + pagination.
     * ILIKE/::date replaced with lower() LIKE and whereBetween on datetimes.
     */
    private function salesLog(Carbon $startDate, Carbon $endDate, string $search): array
    {
        $like = '%'.mb_strtolower($search).'%';

        $paginator = Sale::query()
            ->with(['items.medicine' => fn ($q) => $q->withTrashed(), 'items.batch', 'user'])
            ->whereBetween('created_at', [$startDate, $endDate])
            ->when($search !== '', function ($query) use ($like) {
                $query->where(function ($q) use ($like) {
                    $q->whereRaw('lower(invoice_no) like ?', [$like])
                        ->orWhereRaw('lower(coalesce(customer_name, "")) like ?', [$like])
                        ->orWhereRaw('lower(coalesce(receiver_name, "")) like ?', [$like])
                        ->orWhereHas('user', fn ($u) => $u->whereRaw('lower(name) like ?', [$like]))
                        ->orWhereHas('items.medicine', fn ($m) => $m->withTrashed()->whereRaw('lower(name) like ?', [$like]));
                });
            })
            ->orderByDesc('created_at')
            ->paginate(10)
            ->withQueryString();

        $paginator->through(fn (Sale $sale): array => [
            'id' => $sale->id,
            'invoice_no' => $sale->invoice_no,
            'created_at' => $sale->created_at->toIso8601String(),
            'customer_name' => $sale->customer_name,
            'receiver_name' => $sale->receiver_name,
            'seller_name' => $sale->seller_name ?: $sale->user?->name,
            'payment_method' => $sale->payment_method->value,
            'total_amount' => (float) $sale->total_amount,
            'items' => $sale->items->map(fn ($item): array => [
                'medicine_name' => $item->medicine->name,
                'batch_number' => $item->batch->batch_number,
                'quantity' => $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'total_price' => (float) $item->total_price,
            ])->values(),
        ]);

        return $paginator->toArray();
    }

    /**
     * In-stock batches grouped by expiry: expired (< today), expiring soon
     * (today through +6 months), and healthy (beyond 6 months). Counts are
     * per batch, matching the legacy inventory-health pie.
     *
     * @return array{counts: array{healthy: int, expiring_soon: int, expired: int}, status: string, items: array<string, mixed>}
     */
    private function expiryHealth(string $status): array
    {
        $today = now()->toDateString();
        $soonUntil = now()->addMonths(6)->toDateString();

        $inStock = fn (): Builder => Batch::query()->where('quantity', '>', 0);

        $counts = [
            'healthy' => $this->applyExpiryStatus($inStock(), 'healthy', $today, $soonUntil)->count(),
            'expiring_soon' => $this->applyExpiryStatus($inStock(), 'expiring_soon', $today, $soonUntil)->count(),
            'expired' => $this->applyExpiryStatus($inStock(), 'expired', $today, $soonUntil)->count(),
        ];

        $paginator = $this->applyExpiryStatus($inStock(), $status, $today, $soonUntil)
            ->with(['medicine' => fn ($q) => $q->withTrashed()->with('category')])
            ->orderBy('expiry_date')
            ->orderBy('id')
            ->paginate(10, ['*'], 'healthPage')
            ->withQueryString();

        $paginator->through(fn (Batch $batch): array => [
            'id' => $batch->id,
            'medicine_name' => $batch->medicine->name,
            'category' => $batch->medicine->category?->name ?? 'General',
            'batch_number' => $batch->batch_number,
            'quantity' => $batch->quantity,
            'unit' => $batch->medicine->unit->value,
            'price' => (float) $batch->medicine->default_price,
            'expiry_date' => $batch->expiry_date->toDateString(),
        ]);

        return [
            'counts' => $counts,
            'status' => $status,
            'items' => $paginator->toArray(),
        ];
    }

    private function applyExpiryStatus(Builder $query, string $status, string $today, string $soonUntil): Builder
    {
        return match ($status) {
            'expired' => $query->whereDate('expiry_date', '<', $today),
            'expiring_soon' => $query
                ->whereDate('expiry_date', '>=', $today)
                ->whereDate('expiry_date', '<=', $soonUntil),
            default => $query->whereDate('expiry_date', '>', $soonUntil),
        };
    }

    private function parseExpiryStatus(mixed $value): string
    {
        return in_array($value, ['healthy', 'expiring_soon', 'expired'], true)
            ? $value
            : 'healthy';
    }

    private function parseDate(?string $value): ?Carbon
    {
        if (! $value) {
            return null;
        }

        try {
            return Carbon::parse($value);
        } catch (\Throwable) {
            return null;
        }
    }
}
