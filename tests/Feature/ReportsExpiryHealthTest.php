<?php

use App\Models\Batch;
use App\Models\Medicine;
use App\Models\Store;
use App\Models\User;

beforeEach(function () {
    $this->store = Store::factory()->create();
    $this->admin = User::factory()->admin()->for($this->store)->create();
    $this->medicine = Medicine::factory()->for($this->store)->create(['name' => 'Amoxicillin']);

    $this->actingAs($this->admin);
});

function makeInStockBatch(Store $store, Medicine $medicine, string $expiry, int $quantity = 10): Batch
{
    return Batch::factory()->for($store)->for($medicine)->create([
        'quantity' => $quantity,
        'initial_quantity' => $quantity,
        'expiry_date' => $expiry,
    ]);
}

test('reports classifies in-stock batches as healthy, expiring soon, or expired', function () {
    $expired = makeInStockBatch($this->store, $this->medicine, now()->subDay()->toDateString());
    $expiring = makeInStockBatch($this->store, $this->medicine, now()->addMonths(2)->toDateString());
    $healthy = makeInStockBatch($this->store, $this->medicine, now()->addYear()->toDateString());
    makeInStockBatch($this->store, $this->medicine, now()->subYear()->toDateString(), 0);

    $this->get('/reports?expiryStatus=expired')
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('reports')
                ->where('expiryHealth.counts.expired', 1)
                ->where('expiryHealth.counts.expiring_soon', 1)
                ->where('expiryHealth.counts.healthy', 1)
                ->where('expiryHealth.status', 'expired')
                ->has('expiryHealth.items.data', 1)
                ->where('expiryHealth.items.data.0.id', $expired->id)
                ->where('expiryHealth.items.data.0.medicine_name', 'Amoxicillin'),
        );

    $this->get('/reports?expiryStatus=expiring_soon')
        ->assertInertia(
            fn ($page) => $page
                ->where('expiryHealth.status', 'expiring_soon')
                ->has('expiryHealth.items.data', 1)
                ->where('expiryHealth.items.data.0.id', $expiring->id),
        );

    $this->get('/reports?expiryStatus=healthy')
        ->assertInertia(
            fn ($page) => $page
                ->where('expiryHealth.status', 'healthy')
                ->has('expiryHealth.items.data', 1)
                ->where('expiryHealth.items.data.0.id', $healthy->id),
        );
});

test('a batch expiring today is expiring soon and a batch due after six months is healthy', function () {
    makeInStockBatch($this->store, $this->medicine, now()->toDateString());
    makeInStockBatch($this->store, $this->medicine, now()->addMonths(6)->toDateString());
    makeInStockBatch($this->store, $this->medicine, now()->addMonths(6)->addDay()->toDateString());

    $this->get('/reports')
        ->assertInertia(
            fn ($page) => $page
                ->where('expiryHealth.counts.expired', 0)
                ->where('expiryHealth.counts.expiring_soon', 2)
                ->where('expiryHealth.counts.healthy', 1),
        );
});
