<?php

use App\Models\Batch;
use App\Models\Medicine;
use App\Models\Sale;
use App\Models\StockMovement;
use App\Models\Store;
use App\Models\User;

beforeEach(function () {
    $this->store = Store::factory()->create();
    $this->user = User::factory()->for($this->store)->create();
    $this->medicine = Medicine::factory()->for($this->store)->create(['default_price' => 10.00]);
});

function makeBatch(Store $store, Medicine $medicine, int $quantity, string $expiry): Batch
{
    return Batch::factory()->for($store)->for($medicine)->create([
        'quantity' => $quantity,
        'initial_quantity' => $quantity,
        'expiry_date' => $expiry,
    ]);
}

test('FEFO auto-selects the batch with the earliest expiry date', function () {
    $late = makeBatch($this->store, $this->medicine, 50, now()->addYears(2)->toDateString());
    $early = makeBatch($this->store, $this->medicine, 50, now()->addMonths(3)->toDateString());

    $this->actingAs($this->user)->post(route('sales.store'), [
        'items' => [['medicine_id' => $this->medicine->id, 'quantity' => 5]],
        'payment_method' => 'cash',
    ]);

    expect($early->refresh()->quantity)->toBe(45)
        ->and($late->refresh()->quantity)->toBe(50);
});

test('FEFO skips expired batches', function () {
    $expired = makeBatch($this->store, $this->medicine, 50, now()->subDay()->toDateString());
    $valid = makeBatch($this->store, $this->medicine, 50, now()->addYear()->toDateString());

    $this->actingAs($this->user)->post(route('sales.store'), [
        'items' => [['medicine_id' => $this->medicine->id, 'quantity' => 5]],
        'payment_method' => 'cash',
    ]);

    expect($expired->refresh()->quantity)->toBe(50)
        ->and($valid->refresh()->quantity)->toBe(45);
});

test('FEFO splits a line across batches when the earliest cannot cover it', function () {
    $early = makeBatch($this->store, $this->medicine, 3, now()->addMonths(2)->toDateString());
    $late = makeBatch($this->store, $this->medicine, 50, now()->addYear()->toDateString());

    $this->actingAs($this->user)->post(route('sales.store'), [
        'items' => [['medicine_id' => $this->medicine->id, 'quantity' => 10]],
        'payment_method' => 'cash',
    ]);

    expect($early->refresh()->quantity)->toBe(0)
        ->and($late->refresh()->quantity)->toBe(43);

    $sale = Sale::withoutGlobalScopes()->first();
    expect($sale->items)->toHaveCount(2);
});

test('a manual batch override sells from exactly the chosen batch', function () {
    $early = makeBatch($this->store, $this->medicine, 50, now()->addMonths(2)->toDateString());
    $late = makeBatch($this->store, $this->medicine, 50, now()->addYear()->toDateString());

    $this->actingAs($this->user)->post(route('sales.store'), [
        'items' => [['medicine_id' => $this->medicine->id, 'quantity' => 5, 'batch_id' => $late->id]],
        'payment_method' => 'cash',
    ]);

    expect($early->refresh()->quantity)->toBe(50)
        ->and($late->refresh()->quantity)->toBe(45);
});

test('a sale records header, items, totals, stock movements and a store-scoped invoice number', function () {
    makeBatch($this->store, $this->medicine, 100, now()->addYear()->toDateString());

    $this->actingAs($this->user)->post(route('sales.store'), [
        'items' => [['medicine_id' => $this->medicine->id, 'quantity' => 4, 'unit_price' => 12.50]],
        'customer_name' => 'Abebe',
        'customer_tin' => '0012345678',
        'payment_method' => 'credit',
    ]);

    $sale = Sale::withoutGlobalScopes()->with('items')->first();

    expect($sale)->not->toBeNull()
        ->and($sale->invoice_no)->toBe('INV-'.now()->format('Ymd').'-0001')
        ->and($sale->customer_name)->toBe('Abebe')
        ->and((float) $sale->subtotal)->toBe(50.00)
        ->and((float) $sale->total_amount)->toBe(50.00)
        ->and($sale->items)->toHaveCount(1)
        ->and((float) $sale->items->first()->unit_price)->toBe(12.50);

    $movement = StockMovement::withoutGlobalScopes()->first();
    expect($movement->type->value)->toBe('out')
        ->and($movement->quantity)->toBe(-4)
        ->and($movement->reference_id)->toBe($sale->id);
});

test('invoice numbers increment per store per day', function () {
    makeBatch($this->store, $this->medicine, 100, now()->addYear()->toDateString());

    $this->actingAs($this->user);

    $this->post(route('sales.store'), [
        'items' => [['medicine_id' => $this->medicine->id, 'quantity' => 1]],
        'payment_method' => 'cash',
    ]);
    $this->post(route('sales.store'), [
        'items' => [['medicine_id' => $this->medicine->id, 'quantity' => 1]],
        'payment_method' => 'cash',
    ]);

    $invoices = Sale::withoutGlobalScopes()->orderBy('created_at')->pluck('invoice_no');
    expect($invoices->last())->toBe('INV-'.now()->format('Ymd').'-0002');
});

test('a provided invoice number and seller name are stored instead of the generated defaults', function () {
    makeBatch($this->store, $this->medicine, 100, now()->addYear()->toDateString());

    $this->actingAs($this->user)->post(route('sales.store'), [
        'items' => [['medicine_id' => $this->medicine->id, 'quantity' => 1]],
        'invoice_no' => 'INV-HAWAN-42',
        'seller_name' => 'Cashier One',
        'customer_sno' => 'S-9',
        'reference' => 'PO-100',
        'payment_method' => 'cash',
    ]);

    $sale = Sale::withoutGlobalScopes()->first();

    expect($sale->invoice_no)->toBe('INV-HAWAN-42')
        ->and($sale->seller_name)->toBe('Cashier One')
        ->and($sale->customer_sno)->toBe('S-9')
        ->and($sale->reference)->toBe('PO-100');
});

test('overselling is rejected and nothing is written', function () {
    $batch = makeBatch($this->store, $this->medicine, 3, now()->addYear()->toDateString());

    $response = $this->actingAs($this->user)->post(route('sales.store'), [
        'items' => [['medicine_id' => $this->medicine->id, 'quantity' => 10]],
        'payment_method' => 'cash',
    ]);

    $response->assertInvalid(['items']);

    expect($batch->refresh()->quantity)->toBe(3)
        ->and(Sale::withoutGlobalScopes()->count())->toBe(0)
        ->and(StockMovement::withoutGlobalScopes()->count())->toBe(0);
});

test('two sales against a batch with quantity 1 cannot both succeed', function () {
    // lockForUpdate() serializes concurrent transactions at the DB level;
    // this asserts the invariant it protects: the second sale sees the
    // decremented quantity and is rejected, never overselling.
    $batch = makeBatch($this->store, $this->medicine, 1, now()->addYear()->toDateString());

    $this->actingAs($this->user);

    // Assert each response before firing the next request: the test session
    // is shared, so later validation errors would leak into earlier asserts.
    $this->post(route('sales.store'), [
        'items' => [['medicine_id' => $this->medicine->id, 'quantity' => 1]],
        'payment_method' => 'cash',
    ])->assertValid();

    $this->post(route('sales.store'), [
        'items' => [['medicine_id' => $this->medicine->id, 'quantity' => 1]],
        'payment_method' => 'cash',
    ])->assertInvalid(['items']);

    expect($batch->refresh()->quantity)->toBe(0)
        ->and(Sale::withoutGlobalScopes()->count())->toBe(1);
});

test('a multi-line cart is processed atomically: one bad line rolls back everything', function () {
    $okBatch = makeBatch($this->store, $this->medicine, 100, now()->addYear()->toDateString());

    $scarceMedicine = Medicine::factory()->for($this->store)->create();
    $scarceBatch = makeBatch($this->store, $scarceMedicine, 1, now()->addYear()->toDateString());

    $this->actingAs($this->user)->post(route('sales.store'), [
        'items' => [
            ['medicine_id' => $this->medicine->id, 'quantity' => 5],
            ['medicine_id' => $scarceMedicine->id, 'quantity' => 99],
        ],
        'payment_method' => 'cash',
    ])->assertInvalid(['items']);

    expect($okBatch->refresh()->quantity)->toBe(100)
        ->and($scarceBatch->refresh()->quantity)->toBe(1)
        ->and(Sale::withoutGlobalScopes()->count())->toBe(0);
});
