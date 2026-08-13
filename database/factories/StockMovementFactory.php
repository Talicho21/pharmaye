<?php

namespace Database\Factories;

use App\Enums\MovementType;
use App\Models\Batch;
use App\Models\Store;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\StockMovement>
 */
class StockMovementFactory extends Factory
{
    public function definition(): array
    {
        return [
            'store_id' => Store::factory(),
            'batch_id' => Batch::factory(),
            'type' => MovementType::In,
            'quantity' => fake()->numberBetween(1, 100),
            'reason' => null,
            'reference_type' => null,
            'reference_id' => null,
            'user_id' => User::factory(),
        ];
    }
}
