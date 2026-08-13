<?php

use App\Models\Store;
use Illuminate\Support\Facades\RateLimiter;

beforeEach(function () {
    RateLimiter::clear('');
});

test('find-store page renders', function () {
    $this->get('/find-store')->assertStatus(200);
});

test('an unknown store code returns a generic validation error', function () {
    Store::factory()->create(['slug' => 'hawan-drug-store']);

    $response = $this->from('/find-store')->post('/find-store', ['code' => 'hawan-drug']);

    $response->assertInvalid(['code' => 'Store not found.']);
    $this->assertNull(session('store_id'));
});

test('a valid store code stores the store in session, sets the cookie and redirects to login', function () {
    $store = Store::factory()->create(['slug' => 'hawan-drug-store']);

    $response = $this->post('/find-store', ['code' => 'HAWAN-DRUG-STORE']);

    $response->assertRedirect(route('login'));
    $response->assertCookie('last_store_slug', 'hawan-drug-store');
    expect(session('store_id'))->toBe($store->id);
});

test('store lookup is case-insensitive', function () {
    $store = Store::factory()->create(['slug' => 'hawan-drug-store']);

    $this->post('/find-store', ['code' => '  HaWaN-Drug-Store  ']);

    expect(session('store_id'))->toBe($store->id);
});

test('find-store pre-fills the code from the last_store_slug cookie', function () {
    Store::factory()->create(['slug' => 'hawan-drug-store']);

    // withCookie sends the value encrypted, matching how the app sets it.
    $this->withCookie('last_store_slug', 'hawan-drug-store')
        ->get('/find-store')
        ->assertInertia(fn ($page) => $page->component('auth/find-store')->where('prefillCode', 'hawan-drug-store'));
});

test('a stale cookie pointing to a deleted store is ignored', function () {
    $this->withCookie('last_store_slug', 'gone-store')
        ->get('/find-store')
        ->assertInertia(fn ($page) => $page->where('prefillCode', null));
});

test('find-store lookups are rate limited to 10 per minute', function () {
    Store::factory()->create(['slug' => 'hawan-drug-store']);

    for ($i = 0; $i < 10; $i++) {
        $this->post('/find-store', ['code' => "wrong-{$i}"])->assertStatus(302);
    }

    $this->post('/find-store', ['code' => 'hawan-drug-store'])->assertStatus(429);
});

test('a login attempt with a session pointing to a deleted store is bounced to find-store', function () {
    $store = Store::factory()->create();
    $storeId = $store->id;
    $store->delete();

    $this->withSession(['store_id' => $storeId])
        ->get('/login')
        ->assertRedirect(route('store.find'));
});
