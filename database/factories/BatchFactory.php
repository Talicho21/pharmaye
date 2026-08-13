<?php

namespace Database\Factories;

use App\Models\Medicine;
use App\Models\Store;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Batch>
 */
class BatchFactory extends Factory
{
    public function definition(): array
    {
        $quantity = fake()->numberBetween(10, 500);

        return [
            'store_id' => Store::factory(),
            'medicine_id' => Medicine::factory(),
            'supplier_id' => null,
            'batch_number' => strtoupper(fake()->unique()->bothify('B##??####')),
            'quantity' => $quantity,
            'initial_quantity' => $quantity,
            'unit_cost' => fake()->randomFloat(2, 1, 300),
            'expiry_date' => fake()->dateTimeBetween('+3 months', '+3 years')->format('Y-m-d'),
            'received_at' => now(),
        ];
    }
}
