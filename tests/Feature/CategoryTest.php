<?php

use App\Models\Category;
use App\Models\Store;
use App\Models\User;

beforeEach(function () {
    $this->storeA = Store::factory()->create();
    $this->storeB = Store::factory()->create();
    $this->userA = User::factory()->admin()->for($this->storeA)->create();
    $this->userB = User::factory()->admin()->for($this->storeB)->create();
});

test('every store sees the shared default categories', function () {
    $this->actingAs($this->userA);

    expect(Category::query()->whereNull('store_id')->count())->toBe(count(Category::DEFAULTS))
        ->and(Category::query()->orderBy('name')->pluck('name')->all())
        ->toEqualCanonicalizing(Category::DEFAULTS);

    $this->actingAs($this->userB);

    expect(Category::query()->whereNull('store_id')->count())->toBe(count(Category::DEFAULTS));
});

test('a store-created category is visible only to that store', function () {
    $this->actingAs($this->userA)->post(route('categories.store'), [
        'name' => 'Herbal Mix',
    ])->assertRedirect();

    $this->actingAs($this->userA);
    expect(Category::query()->where('name', 'Herbal Mix')->exists())->toBeTrue();

    $owned = Category::query()->where('name', 'Herbal Mix')->first();
    expect($owned->store_id)->toBe($this->storeA->id)
        ->and($owned->isGlobal())->toBeFalse();

    $this->actingAs($this->userB);
    expect(Category::query()->where('name', 'Herbal Mix')->exists())->toBeFalse();
});

test('a store cannot recreate a shared category name', function () {
    $this->actingAs($this->userA)
        ->post(route('categories.store'), ['name' => 'Tablets & Capsules'])
        ->assertRedirect()
        ->assertSessionHasErrors('name');

    expect(Category::query()->where('name', 'Tablets & Capsules')->where('store_id', $this->storeA->id)->exists())->toBeFalse();
});

test('two stores may each add the same custom category name', function () {
    $this->actingAs($this->userA)->post(route('categories.store'), ['name' => 'Eye Drops'])->assertRedirect();
    $this->actingAs($this->userB)->post(route('categories.store'), ['name' => 'Eye Drops'])->assertRedirect();

    expect(Category::withoutGlobalScopes()->where('name', 'Eye Drops')->count())->toBe(2);
});

test('stock entry can assign a shared category and rejects another stores custom category', function () {
    $this->actingAs($this->userB)->post(route('categories.store'), ['name' => 'Store B Only'])->assertRedirect();

    $this->actingAs($this->userB);
    $foreignId = Category::query()->where('name', 'Store B Only')->value('id');

    $this->actingAs($this->userA);
    $globalId = Category::query()->where('name', 'Antibiotics & Antivirals')->value('id');

    $this->post(route('batches.store'), [
        'medicine_name' => 'Amoxicillin',
        'unit' => 'capsule',
        'category_id' => $globalId,
        'batch_number' => 'B-CAT-1',
        'quantity' => 10,
        'expiry_date' => now()->addYear()->toDateString(),
    ])->assertRedirect();

    $this->post(route('batches.store'), [
        'medicine_name' => 'Secret Cream',
        'unit' => 'tube',
        'category_id' => $foreignId,
        'batch_number' => 'B-CAT-2',
        'quantity' => 10,
        'expiry_date' => now()->addYear()->toDateString(),
    ])->assertSessionHasErrors('category_id');
});
