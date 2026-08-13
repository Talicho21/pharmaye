<?php

namespace Database\Factories;

use App\Enums\PaymentMethod;
use App\Models\Store;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Sale>
 */
class SaleFactory extends Factory
{
    public function definition(): array
    {
        $subtotal = fake()->randomFloat(2, 5, 2000);

        return [
            'store_id' => Store::factory(),
            'user_id' => User::factory(),
            'invoice_no' => 'INV-'.fake()->unique()->numerify('######'),
            'customer_name' => fake()->optional()->name(),
            'subtotal' => $subtotal,
            'tax_amount' => 0,
            'discount_amount' => 0,
            'total_amount' => $subtotal,
            'payment_method' => PaymentMethod::Cash,
            'sync_status' => 'synced',
        ];
    }
}
