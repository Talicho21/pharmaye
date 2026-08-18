<?php

use App\Models\Medicine;
use App\Models\Store;
use App\Models\User;

beforeEach(function () {
    $this->store = Store::factory()->create();
    $this->user = User::factory()->for($this->store)->create();
});

test('creating a new medicine stores the low stock level from stock entry', function () {
    $this->actingAs($this->user)->post(route('batches.store'), [
        'medicine_name' => 'Amoxicillin 500mg',
        'unit' => 'capsule',
        'batch_number' => 'B-100',
        'quantity' => 40,
        'expiry_date' => now()->addYear()->toDateString(),
        'reorder_level' => 8,
    ])->assertRedirect();

    $medicine = Medicine::query()->first();

    expect($medicine)->not->toBeNull()
        ->and($medicine->name)->toBe('Amoxicillin 500mg')
        ->and($medicine->reorder_level)->toBe(8)
        ->and(Medicine::query()->lowStock()->whereKey($medicine->id)->exists())->toBeFalse();
});

test('a medicine is low stock when remaining units fall to the reorder level', function () {
    $this->actingAs($this->user)->post(route('batches.store'), [
        'medicine_name' => 'Paracetamol',
        'unit' => 'tablet',
        'batch_number' => 'B-200',
        'quantity' => 5,
        'expiry_date' => now()->addYear()->toDateString(),
        'reorder_level' => 5,
    ])->assertRedirect();

    expect(Medicine::query()->lowStock()->count())->toBe(1);
});

test('restocking an existing medicine can update its low stock level', function () {
    $medicine = Medicine::factory()->for($this->store)->create(['reorder_level' => 10]);

    $this->actingAs($this->user)->post(route('batches.store'), [
        'medicine_id' => $medicine->id,
        'batch_number' => 'B-300',
        'quantity' => 20,
        'expiry_date' => now()->addYear()->toDateString(),
        'reorder_level' => 3,
    ])->assertRedirect();

    expect($medicine->refresh()->reorder_level)->toBe(3);
});
