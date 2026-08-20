<?php

use App\Enums\SubscriptionStatus;
use App\Models\AdminActivityLog;
use App\Models\PlatformAdmin;
use App\Models\Store;
use App\Models\User;

beforeEach(function () {
    $this->platformAdmin = PlatformAdmin::factory()->create([
        'email' => 'owner@pharmaye.test',
        'password' => 'password',
    ]);
});

test('a platform admin cannot authenticate via the tenant store login', function () {
    $store = Store::factory()->create();

    $this->withSession(['store_id' => $store->id])->post('/login', [
        'email' => 'owner@pharmaye.test',
        'password' => 'password',
    ]);

    $this->assertGuest('web');
    $this->assertGuest('admin');
});

test('a store user cannot authenticate via the platform admin login', function () {
    $user = User::factory()->create();

    $this->post('/admin/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertGuest('admin');
    $this->assertGuest('web');
});

test('a platform admin can sign in at /admin/login and reach the dashboard', function () {
    $this->post('/admin/login', [
        'email' => 'owner@pharmaye.test',
        'password' => 'password',
    ])->assertRedirect(route('admin.dashboard'));

    $this->assertAuthenticatedAs($this->platformAdmin, 'admin');
    $this->assertGuest('web');

    $this->get(route('admin.dashboard'))->assertOk();
});

test('a store user cannot open the platform dashboard', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get(route('admin.dashboard'))->assertRedirect(route('admin.login'));
});

test('a platform admin store index lists stores from every tenant', function () {
    $storeA = Store::factory()->create(['name' => 'Alpha Pharmacy']);
    $storeB = Store::factory()->create(['name' => 'Beta Pharmacy']);

    $this->actingAs($this->platformAdmin, 'admin')
        ->get(route('admin.stores.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/stores/index')
            ->has('stores.data', 2)
            ->where('stores.data.0.name', 'Alpha Pharmacy')
            ->where('stores.data.1.name', 'Beta Pharmacy')
        );

    expect($storeA->id)->not->toBe($storeB->id);
});

test('the store detail page loads inventory value without an ambiguous store_id error', function () {
    $store = Store::factory()->create();
    $medicine = \App\Models\Medicine::factory()->for($store)->create(['default_price' => 10]);
    \App\Models\Batch::factory()->for($store)->for($medicine)->create(['quantity' => 4]);

    $this->actingAs($this->platformAdmin, 'admin')
        ->get(route('admin.stores.show', $store))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/stores/show')
            ->where('stats.inventory_value', 40)
        );
});

test('creating a store writes exactly one activity log for the acting platform admin', function () {
    $this->actingAs($this->platformAdmin, 'admin')
        ->post(route('admin.stores.store'), [
            'name' => 'New Pharmacy',
            'slug' => 'new-pharmacy',
            'plan' => 'standard',
            'monthly_fee' => 2000,
            'subscription_status' => 'trial',
            'admin_name' => 'Store Admin',
            'admin_email' => 'admin@new.local',
            'admin_password' => 'password',
        ])
        ->assertRedirect();

    expect(Store::query()->where('slug', 'new-pharmacy')->exists())->toBeTrue()
        ->and(User::query()->where('email', 'admin@new.local')->exists())->toBeTrue()
        ->and(AdminActivityLog::query()->count())->toBe(1);

    $log = AdminActivityLog::query()->first();
    expect($log->action)->toBe('store.created')
        ->and($log->platform_admin_id)->toBe($this->platformAdmin->id);
});

test('updating, suspending and activating a store each write one activity log', function () {
    $store = Store::factory()->create(['name' => 'Target Store', 'subscription_status' => SubscriptionStatus::Active]);

    $this->actingAs($this->platformAdmin, 'admin');

    $this->put(route('admin.stores.update', $store), [
        'name' => 'Target Store',
        'slug' => $store->slug,
        'plan' => 'premium',
        'monthly_fee' => 3000,
        'subscription_status' => 'active',
        'address' => $store->address,
        'phone' => $store->phone,
        'trial_ends_at' => $store->trial_ends_at?->toDateString(),
    ])->assertRedirect();

    $this->post(route('admin.stores.suspend', $store))->assertRedirect();
    expect($store->refresh()->subscription_status)->toBe(SubscriptionStatus::Suspended);

    $this->post(route('admin.stores.activate', $store))->assertRedirect();
    expect($store->refresh()->subscription_status)->toBe(SubscriptionStatus::Active);

    $actions = AdminActivityLog::query()->orderBy('id')->pluck('action')->all();
    expect($actions)->toBe(['store.updated', 'store.suspended', 'store.activated'])
        ->and(AdminActivityLog::query()->pluck('platform_admin_id')->unique()->all())
        ->toBe([$this->platformAdmin->id]);
});

test('resetting a password and deactivating a user each write one activity log', function () {
    $user = User::factory()->create();

    $this->actingAs($this->platformAdmin, 'admin');

    $this->post(route('admin.users.password-reset', $user))->assertRedirect();
    $this->post(route('admin.users.deactivate', $user))->assertRedirect();

    expect($user->refresh()->deactivated_at)->not->toBeNull();

    $actions = AdminActivityLog::query()->orderBy('id')->pluck('action')->all();
    expect($actions)->toBe(['user.password_reset', 'user.deactivated'])
        ->and(AdminActivityLog::query()->where('platform_admin_id', $this->platformAdmin->id)->count())->toBe(2);
});

test('a deactivated store user cannot sign in at the tenant login', function () {
    $user = User::factory()->create(['deactivated_at' => now()]);

    $this->withSession(['store_id' => $user->store_id])->post('/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertGuest('web');
});
