<?php

namespace Database\Factories;

use App\Enums\MedicineUnit;
use App\Models\Store;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Medicine>
 */
class MedicineFactory extends Factory
{
    public function definition(): array
    {
        return [
            'store_id' => Store::factory(),
            'category_id' => null,
            'name' => ucfirst(fake()->unique()->words(2, true)),
            'generic_name' => fake()->optional()->word(),
            'unit' => fake()->randomElement(MedicineUnit::cases()),
            'units_per_box' => fake()->optional()->numberBetween(2, 100),
            'default_price' => fake()->randomFloat(2, 1, 500),
            'reorder_level' => 10,
        ];
    }
}
