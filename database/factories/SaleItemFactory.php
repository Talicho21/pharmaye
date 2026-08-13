<?php

namespace Database\Factories;

use App\Models\Batch;
use App\Models\Medicine;
use App\Models\Sale;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\SaleItem>
 */
class SaleItemFactory extends Factory
{
    public function definition(): array
    {
        $quantity = fake()->numberBetween(1, 10);
        $unitPrice = fake()->randomFloat(2, 1, 200);

        return [
            'sale_id' => Sale::factory(),
            'batch_id' => Batch::factory(),
            'medicine_id' => Medicine::factory(),
            'quantity' => $quantity,
            'unit_price' => $unitPrice,
            'total_price' => round($quantity * $unitPrice, 2),
        ];
    }
}
