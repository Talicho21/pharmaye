<?php

it('redirects guests hitting the root to the store finder', function () {
    $this->get('/')->assertRedirect(route('store.find'));
});

it('redirects authenticated users hitting the root to the dashboard', function () {
    $this->actingAs(\App\Models\User::factory()->create());

    $this->get('/')->assertRedirect(route('dashboard'));
});
