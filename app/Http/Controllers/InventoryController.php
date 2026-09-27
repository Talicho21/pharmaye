<?php

namespace App\Http\Controllers;

use App\Enums\MovementType;
use App\Http\Requests\StoreBatchRequest;
use App\Models\Batch;
use App\Models\Category;
use App\Models\Medicine;
use App\Models\StockMovement;
use App\Models\Supplier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Batch CRUD. All queries are tenant-scoped by the store global scopes
 * on Batch/Medicine/Category — no manual store_id filtering here.
 * Categories also include shared (store_id null) rows.
 */
class InventoryController extends Controller
{
    /**
     * Inventory list page (read-only view of existing stock).
     */
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));
        $categoryId = $request->integer('category') ?: null;

        return Inertia::render('inventory', [
            'batches' => function () use ($search, $categoryId) {
                return Batch::query()
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
                    ->paginate(15)
                    ->withQueryString()
                    ->through(fn (Batch $batch): array => [
                        'id' => $batch->id,
                        'medicine_id' => $batch->medicine_id,
                        'name' => $batch->medicine->name,
                        'category' => $batch->medicine->category?->name,
                        'batch_number' => $batch->batch_number,
                        'quantity' => $batch->quantity,
                        'unit' => $batch->medicine->unit->value,
                        'price' => (float) $batch->medicine->default_price,
                        'expiry_date' => $batch->expiry_date->toDateString(),
                        'is_expired' => $batch->isExpired(),
                    ]);
            },
            'categories' => fn () => Category::query()->orderBy('name')->get(['id', 'name']),
            'filters' => [
                'search' => $search,
                'category' => $categoryId,
            ],
        ]);
    }

    /**
     * Stock-Entry page.
     */
    public function create(): Response
    {
        return Inertia::render('stock-entry', [
            'categories' => fn () => Category::query()->orderBy('name')->get(['id', 'name']),
            'suppliers' => fn () => Supplier::query()->orderBy('name')->get(['id', 'name']),
            'medicines' => fn () => Medicine::query()->orderBy('name')->get(['id', 'name', 'unit', 'default_price', 'reorder_level']),
        ]);
    }

    /**
     * Register an incoming batch (stock-in), creating the medicine and/or
     * category on the fly when needed.
     */
    public function store(StoreBatchRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($validated, $request): void {
            $categoryId = $validated['category_id'] ?? null;

            if (! $categoryId && ! empty($validated['new_category_name'])) {
                $name = trim($validated['new_category_name']);
                $category = Category::query()
                    ->whereRaw('lower(name) = ?', [mb_strtolower($name)])
                    ->first() ?? Category::query()->create(['name' => $name]);
                $categoryId = $category->id;
            }

            if (! empty($validated['medicine_id'])) {
                $medicine = Medicine::query()->findOrFail($validated['medicine_id']);

                $updates = [];
                if (isset($validated['default_price'])) {
                    $updates['default_price'] = $validated['default_price'];
                }
                if (array_key_exists('reorder_level', $validated) && $validated['reorder_level'] !== null) {
                    $updates['reorder_level'] = $validated['reorder_level'];
                }
                if ($updates !== []) {
                    $medicine->update($updates);
                }
            } else {
                $medicine = Medicine::query()->create([
                    'category_id' => $categoryId,
                    'name' => trim($validated['medicine_name']),
                    'generic_name' => $validated['generic_name'] ?? null,
                    'unit' => $validated['unit'],
                    'units_per_box' => $validated['units_per_box'] ?? null,
                    'default_price' => $validated['default_price'] ?? 0,
                    'reorder_level' => $validated['reorder_level'] ?? 10,
                ]);
            }

            $batch = Batch::query()->create([
                'medicine_id' => $medicine->id,
                'supplier_id' => $validated['supplier_id'] ?? null,
                'batch_number' => trim($validated['batch_number']),
                'quantity' => $validated['quantity'],
                'initial_quantity' => $validated['quantity'],
                'unit_cost' => $validated['unit_cost'] ?? 0,
                'expiry_date' => $validated['expiry_date'],
                'received_at' => now(),
            ]);

            StockMovement::query()->create([
                'batch_id' => $batch->id,
                'type' => MovementType::In,
                'quantity' => $batch->quantity,
                'reason' => 'Stock entry',
                'reference_type' => Batch::class,
                'reference_id' => (string) $batch->id,
                'user_id' => $request->user()->id,
            ]);
        });

        return back()->with('success', 'Stock batch added successfully.');
    }

    /**
     * Inline edit of a batch (and the medicine price it displays).
     */
    public function update(Request $request, Batch $batch): RedirectResponse
    {
        $validated = $request->validate([
            'batch_number' => ['sometimes', 'string', 'max:100'],
            'quantity' => ['sometimes', 'integer', 'min:0'],
            'expiry_date' => ['sometimes', 'date'],
            'unit_cost' => ['sometimes', 'numeric', 'min:0'],
            'price' => ['sometimes', 'numeric', 'min:0'],
            'name' => ['sometimes', 'string', 'max:255'],
            'unit' => ['sometimes', Rule::enum(\App\Enums\MedicineUnit::class)],
        ]);

        DB::transaction(function () use ($batch, $validated, $request): void {
            if (array_key_exists('quantity', $validated) && $validated['quantity'] !== $batch->quantity) {
                $delta = $validated['quantity'] - $batch->quantity;

                StockMovement::query()->create([
                    'batch_id' => $batch->id,
                    'type' => MovementType::Adjustment,
                    'quantity' => $delta,
                    'reason' => 'Manual inline adjustment',
                    'reference_type' => Batch::class,
                    'reference_id' => (string) $batch->id,
                    'user_id' => $request->user()->id,
                ]);
            }

            $batch->update(collect($validated)->only(['batch_number', 'quantity', 'expiry_date', 'unit_cost'])->all());

            $medicineChanges = [];
            if (array_key_exists('price', $validated)) {
                $medicineChanges['default_price'] = $validated['price'];
            }
            if (array_key_exists('name', $validated)) {
                $medicineChanges['name'] = $validated['name'];
            }
            if (array_key_exists('unit', $validated)) {
                $medicineChanges['unit'] = $validated['unit'];
            }

            if ($medicineChanges !== []) {
                $batch->medicine->update($medicineChanges);
            }
        });

        return back()->with('success', 'Inventory item updated.');
    }

    /**
     * Delete a batch (admin only, enforced at the route level).
     */
    public function destroy(Batch $batch): RedirectResponse
    {
        // Historical sales reference batches; block deletion in that case.
        if ($batch->stockMovements()->where('type', MovementType::Out)->exists()) {
            return back()->withErrors(['batch' => 'This batch has recorded sales and cannot be deleted.']);
        }

        DB::transaction(function () use ($batch): void {
            $batch->stockMovements()->delete();
            $batch->delete();
        });

        return back()->with('success', 'Batch removed from inventory.');
    }
}
