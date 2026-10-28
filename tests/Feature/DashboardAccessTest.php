<?php

use App\Models\Store;
use App\Models\User;

beforeEach(function () {
    $this->store = Store::factory()->create();
});

test('store admins receive the sales summary on the dashboard', function () {
    $admin = User::factory()->admin()->for($this->store)->create();

    $this->actingAs($admin)
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('dashboard')
                ->has('salesSummary'),
        );
});

test('staff do not receive the sales summary on the dashboard', function () {
    $staff = User::factory()->for($this->store)->create();

    $this->actingAs($staff)
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('dashboard')
                ->where('salesSummary', null),
        );
});