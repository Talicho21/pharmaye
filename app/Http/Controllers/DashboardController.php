<?php

namespace App\Http\Controllers;

use App\Models\Batch;
use App\Models\Category;
use App\Models\Medicine;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));
        $categoryId = $request->integer('category') ?: null;

        $batches = Batch::query()
            ->with(['medicine' => fn ($q) => $q->withTrashed()->with('category')])
            ->when($search !== '', function ($query) use ($search) {
                $like = '%'.mb_strtolower($search).'%';
                $query->where(function ($q) use ($like) {
                    $q->whereRaw('lower(batch_number) like ?', [$like])
                        ->orWhereHas('medicine', fn ($m) => $m->withTrashed()->whereRaw('lower(name) like ?', [$like]));
                });
            })
            ->when($categoryId, function ($query) use ($categoryId) {
                $query->whereHas('medicine', fn ($m) => $m->where('category_id', $categoryId));
            })
            ->join('medicines', 'medicines.id', '=', 'batches.medicine_id')
            ->orderBy('medicines.name')
            ->orderBy('batches.expiry_date')
            ->select('batches.*')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Batch $batch): array => [
                'id' => $batch->id,
                'medicine_id' => $batch->medicine_id,
                'name' => $batch->medicine->name,
                'category' => $batch->medicine->category?->name,
                'batch_number' => $batch->batch_number,
                'quantity' => $batch->quantity,
                'initial_quantity' => $batch->initial_quantity,
                'unit' => $batch->medicine->unit->value,
                'price' => (float) $batch->medicine->default_price,
                'expiry_date' => $batch->expiry_date->toDateString(),
                'is_expired' => $batch->isExpired(),
            ]);

        $today = now()->toDateString();

        // Build analytics props using the shared AnalyticsController helper.
        // This is admin-only content; the React side guards it with isAdmin.
        // We pass a fresh request so analytics defaults to 'monthly' / no filters
        // unless the user arrives from a bookmarked analytics-filtered URL.
        $analyticsController = new AnalyticsController();
        $analytics = $analyticsController->analyticsProps($request);

        return Inertia::render('dashboard', [
            'batches' => $batches,
            'categories' => Category::query()->orderBy('name')->get(['id', 'name']),
            'filters' => [
                'search' => $search,
                'category' => $categoryId,
            ],
            'kpis' => [
                'total_batches' => Batch::query()->count(),
                'total_medicines' => Medicine::query()->count(),
                'low_stock' => Medicine::query()->lowStock()->count(),
                'expired' => Batch::query()->where('quantity', '>', 0)->whereDate('expiry_date', '<', $today)->count(),
                'inventory_value' => (float) Batch::query()
                    ->join('medicines', 'medicines.id', '=', 'batches.medicine_id')
                    ->selectRaw('coalesce(sum(batches.quantity * medicines.default_price), 0) as value')
                    ->value('value'),
            ],
            'analytics' => $analytics,
        ]);
    }
}
