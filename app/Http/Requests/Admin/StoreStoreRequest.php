<?php

namespace App\Http\Requests\Admin;

use App\Enums\SubscriptionStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreStoreRequest extends FormRequest
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
        return [
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'alpha_dash', 'unique:stores,slug'],
            'address' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'plan' => ['required', 'string', 'max:50'],
            'monthly_fee' => ['required', 'numeric', 'min:0'],
            'subscription_status' => ['required', Rule::enum(SubscriptionStatus::class)],
            'trial_ends_at' => ['nullable', 'date'],
            'admin_name' => ['required', 'string', 'max:255'],
            'admin_email' => ['required', 'email', 'max:255'],
            'admin_password' => ['required', Password::defaults()],
        ];
    }
}
