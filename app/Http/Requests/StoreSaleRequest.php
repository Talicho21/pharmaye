<?php

namespace App\Http\Requests;

use App\Enums\PaymentMethod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $rules = [
            'items' => ['required', 'array', 'min:1'],
            'items.*.medicine_id' => ['required', 'integer'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            // Manual batch override for returns/edge cases; FEFO by default.
            'items.*.batch_id' => ['nullable', 'integer'],
            'items.*.unit_price' => ['nullable', 'numeric', 'min:0'],
        ];

        $fieldConfigs = \App\Models\SellOutFieldConfig::where('store_id', $this->user()->store_id)
            ->where('is_active', true)
            ->get();
        foreach ($fieldConfigs as $field) {
            $fieldRules = [];
            if ($field->is_required) {
                $fieldRules[] = 'required';
            } else {
                $fieldRules[] = 'nullable';
            }
            if ($field->input_type === 'number') {
                $fieldRules[] = 'numeric';
            } elseif ($field->input_type === 'date') {
                $fieldRules[] = 'date';
            } else {
                $fieldRules[] = 'string';
                $fieldRules[] = 'max:255';
            }
            $rules[$field->field_key] = $fieldRules;
        }

        // Hardcode subtotal modifiers (not part of dynamic config form yet)
        $rules['discount_amount'] = ['nullable', 'numeric', 'min:0'];
        $rules['tax_amount'] = ['nullable', 'numeric', 'min:0'];

        return $rules;
    }
}
