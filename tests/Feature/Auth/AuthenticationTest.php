<?php

use App\Models\Store;
use App\Models\User;

test('login screen redirects to find-store when no store is selected', function () {
    $this->get('/login')->assertRedirect(route('store.find'));
});

test('login screen renders once a store is selected', function () {
    $store = Store::factory()->create();

    $this->withSession(['store_id' => $store->id])
        ->get('/login')
        ->assertStatus(200);
});

test('users can authenticate against their own store', function () {
    $user = User::factory()->create();

    $response = $this->withSession(['store_id' => $user->store_id])->post('/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard', absolute: false));
});

test('users can not authenticate with invalid password', function () {
    $user = User::factory()->create();

    $this->withSession(['store_id' => $user->store_id])->post('/login', [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    $this->assertGuest();
});

test('users can not authenticate against a different store even with valid credentials', function () {
    $user = User::factory()->create();
    $otherStore = Store::factory()->create();

    $this->withSession(['store_id' => $otherStore->id])->post('/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertGuest();
});

test('same email can exist in two stores and resolves to the store-scoped account', function () {
    $storeA = Store::factory()->create();
    $storeB = Store::factory()->create();

    $userA = User::factory()->for($storeA)->create(['email' => 'shared@example.com']);
    User::factory()->for($storeB)->create(['email' => 'shared@example.com']);

    $this->withSession(['store_id' => $storeA->id])->post('/login', [
        'email' => 'shared@example.com',
        'password' => 'password',
    ]);

    $this->assertAuthenticatedAs($userA);
});

test('users can logout', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/logout');

    $this->assertGuest();
    $response->assertRedirect('/');
});
