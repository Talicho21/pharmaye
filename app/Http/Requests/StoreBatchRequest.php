<?php

namespace App\Http\Requests;

use App\Enums\MedicineUnit;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Either an existing medicine or enough fields to create one.
            'medicine_id' => ['nullable', 'integer', 'required_without:medicine_name'],
            'medicine_name' => ['nullable', 'string', 'max:255', 'required_without:medicine_id'],
            'generic_name' => ['nullable', 'string', 'max:255'],
            'unit' => ['nullable', Rule::enum(MedicineUnit::class), 'required_without:medicine_id'],
            'units_per_box' => ['nullable', 'integer', 'min:1'],
            'category_id' => ['nullable', 'integer'],
            'new_category_name' => ['nullable', 'string', 'max:255'],
            'default_price' => ['nullable', 'numeric', 'min:0'],

            'batch_number' => ['required', 'string', 'max:100'],
            'quantity' => ['required', 'integer', 'min:1'],
            'unit_cost' => ['nullable', 'numeric', 'min:0'],
            'expiry_date' => ['required', 'date', 'after:today'],
            'supplier_id' => ['nullable', 'integer'],
        ];
    }
}
