<?php

use App\Models\Batch;
use App\Models\Category;
use App\Models\Medicine;
use App\Models\Sale;
use App\Models\Store;
use App\Models\User;

beforeEach(function () {
    $this->storeA = Store::factory()->create();
    $this->storeB = Store::factory()->create();

    $this->userA = User::factory()->admin()->for($this->storeA)->create();
    $this->userB = User::factory()->admin()->for($this->storeB)->create();

    $this->medicineB = Medicine::factory()->for($this->storeB)->create(['name' => 'Store B Secret Med']);
    $this->batchB = Batch::factory()->for($this->storeB)->for($this->medicineB)->create();
});

test('the global scope hides other stores rows from every eloquent query', function () {
    $this->actingAs($this->userA);

    expect(Medicine::query()->count())->toBe(0)
        ->and(Batch::query()->count())->toBe(0);

    $this->actingAs($this->userB);

    expect(Medicine::query()->count())->toBe(1)
        ->and(Batch::query()->count())->toBe(1);
});

test('models created while authenticated are automatically stamped with the users store', function () {
    $this->actingAs($this->userA);

    $category = Category::query()->create(['name' => 'Painkillers']);

    expect($category->store_id)->toBe($this->storeA->id);
});

test('the dashboard never lists another stores inventory', function () {
    Batch::factory()->for($this->storeA)->for(Medicine::factory()->for($this->storeA)->create())->create();

    $this->actingAs($this->userA)
        ->get('/dashboard')
        ->assertInertia(
            fn ($page) => $page
                ->component('dashboard')
                ->where('kpis.total_batches', 1)
                ->has('batches.data', 1),
        );
});

test('sell-out search cannot find another stores medicines', function () {
    $this->actingAs($this->userA)
        ->get('/sell-out?search=Secret')
        ->assertInertia(fn ($page) => $page->has('results', 0));
});

test('a user cannot update another stores batch', function () {
    $this->actingAs($this->userA)
        ->put(route('batches.update', $this->batchB->id), ['quantity' => 0])
        ->assertNotFound();
});

test('a user cannot delete another stores batch', function () {
    $this->actingAs($this->userA)
        ->delete(route('batches.destroy', $this->batchB->id))
        ->assertNotFound();

    $this->assertDatabaseHas('batches', ['id' => $this->batchB->id]);
});

test('a sale cannot reference another stores medicine', function () {
    $this->actingAs($this->userA)
        ->post(route('sales.store'), [
            'items' => [['medicine_id' => $this->medicineB->id, 'quantity' => 1]],
            'payment_method' => 'cash',
        ])
        ->assertNotFound();

    expect(Sale::withoutGlobalScopes()->count())->toBe(0);
});

test('reports only aggregate the authenticated users store', function () {
    $this->actingAs($this->userB)
        ->post(route('sales.store'), [
            'items' => [['medicine_id' => $this->medicineB->id, 'quantity' => 2]],
            'payment_method' => 'cash',
        ]);

    $this->actingAs($this->userA)
        ->get('/reports')
        ->assertInertia(
            fn ($page) => $page
                ->component('reports')
                ->where('overview.totalRevenue', 0)
                ->where('overview.totalItemsSold', 0)
                ->has('salesLog.data', 0),
        );
});

test('staff cannot access reports', function () {
    $staff = User::factory()->for($this->storeA)->create();

    $this->actingAs($staff)->get('/reports')->assertForbidden();
});
