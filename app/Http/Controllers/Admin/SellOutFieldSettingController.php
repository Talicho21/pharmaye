<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SellOutFieldConfig;
use App\Models\Store;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Validation\Rule;

class SellOutFieldSettingController extends Controller
{
    public function index(Request $request): Response
    {
        $stores = Store::orderBy('name')->get(['id', 'name']);
        
        $selectedStoreId = (int) $request->query('store_id');
        if (!$selectedStoreId && $stores->isNotEmpty()) {
            $selectedStoreId = $stores->first()->id;
        }

        $fields = SellOutFieldConfig::where('store_id', $selectedStoreId)
            ->orderBy('section')
            ->orderBy('sort_order')
            ->get()
            ->groupBy('section');

        return Inertia::render('admin/sell-out-field-settings', [
            'stores' => $stores,
            'selectedStoreId' => $selectedStoreId,
            'fields' => $fields,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'store_id' => 'required|exists:stores,id',
            'section' => 'required|in:order_summary,customer_information,cash_credit',
            'field_key' => [
                'required',
                'string',
                'max:50',
                Rule::unique('sell_out_field_configs', 'field_key')->where(function ($query) use ($request) {
                    return $query->where('store_id', $request->store_id);
                }),
            ],
            'label' => 'required|string|max:255',
            'input_type' => 'required|in:text,number,date,dropdown',
            'is_required' => 'boolean',
        ]);

        $maxSort = SellOutFieldConfig::where('store_id', $validated['store_id'])
            ->where('section', $validated['section'])
            ->max('sort_order') ?? 0;
        
        SellOutFieldConfig::create([
            ...$validated,
            'is_active' => true,
            'sort_order' => $maxSort + 1,
        ]);

        return back()->with('success', 'Field added successfully.');
    }

    public function update(Request $request, SellOutFieldConfig $sell_out_field_setting): RedirectResponse
    {
        $validated = $request->validate([
            'is_required' => 'boolean',
            'is_active' => 'boolean',
        ]);

        $sell_out_field_setting->update($validated);

        return back()->with('success', 'Field updated successfully.');
    }

    public function destroy(Request $request, SellOutFieldConfig $sell_out_field_setting): RedirectResponse
    {
        $sell_out_field_setting->update(['is_active' => false]);

        return back()->with('success', 'Field deactivated successfully.');
    }
}
