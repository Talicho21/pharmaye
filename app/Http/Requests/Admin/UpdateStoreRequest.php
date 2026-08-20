<?php

namespace App\Http\Requests\Admin;

use App\Enums\SubscriptionStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $storeId = $this->route('store')?->id;

        return [
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'alpha_dash', Rule::unique('stores', 'slug')->ignore($storeId)],
            'address' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'plan' => ['required', 'string', 'max:50'],
            'monthly_fee' => ['required', 'numeric', 'min:0'],
            'subscription_status' => ['required', Rule::enum(SubscriptionStatus::class)],
            'trial_ends_at' => ['nullable', 'date'],
        ];
    }
}
