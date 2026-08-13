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
 * Batch CRUD. All queries are tenant-scoped by the StoreScope global scope
 * on Batch/Medicine/Category — no manual store_id filtering here.
 */
class InventoryController extends Controller
{
    /**
     * Stock-Entry page.
     */
    public function create(): Response
    {
        return Inertia::render('stock-entry', [
            'categories' => Category::query()->orderBy('name')->get(['id', 'name']),
            'suppliers' => Supplier::query()->orderBy('name')->get(['id', 'name']),
            'medicines' => Medicine::query()->orderBy('name')->get(['id', 'name', 'unit', 'default_price']),
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

                if (isset($validated['default_price'])) {
                    $medicine->update(['default_price' => $validated['default_price']]);
                }
            } else {
                $medicine = Medicine::query()->create([
                    'category_id' => $categoryId,
                    'name' => trim($validated['medicine_name']),
                    'generic_name' => $validated['generic_name'] ?? null,
                    'unit' => $validated['unit'],
                    'units_per_box' => $validated['units_per_box'] ?? null,
                    'default_price' => $validated['default_price'] ?? 0,
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
