<?php

use App\Http\Controllers\Admin\ActivityLogController;
use App\Http\Controllers\Admin\AuthenticatedSessionController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\SettingsController;
use App\Http\Controllers\Admin\StoreController;
use App\Http\Controllers\Admin\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('admin')->name('admin.')->middleware('admin.guard')->group(function () {
    Route::middleware('guest:admin')->group(function () {
        Route::get('login', [AuthenticatedSessionController::class, 'create'])->name('login');
        Route::post('login', [AuthenticatedSessionController::class, 'store'])->middleware('throttle:10,1');
    });

    Route::middleware('auth:admin')->group(function () {
        Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');

        Route::get('/', fn () => redirect()->route('admin.dashboard'));
        Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

        Route::get('stores', [StoreController::class, 'index'])->name('stores.index');
        Route::get('stores/create', [StoreController::class, 'create'])->name('stores.create');
        Route::post('stores', [StoreController::class, 'store'])->name('stores.store');
        Route::get('stores/{store}', [StoreController::class, 'show'])->name('stores.show');
        Route::put('stores/{store}', [StoreController::class, 'update'])->name('stores.update');
        Route::post('stores/{store}/suspend', [StoreController::class, 'suspend'])->name('stores.suspend');
        Route::post('stores/{store}/activate', [StoreController::class, 'activate'])->name('stores.activate');
        Route::delete('stores/{store}', [StoreController::class, 'destroy'])->name('stores.destroy');

        Route::get('users', [UserController::class, 'index'])->name('users.index');
        Route::post('users/{user}/password-reset', [UserController::class, 'resetPassword'])->name('users.password-reset');
        Route::post('users/{user}/deactivate', [UserController::class, 'deactivate'])->name('users.deactivate');
        Route::post('users/{user}/activate', [UserController::class, 'activate'])->name('users.activate');

        Route::get('activity', [ActivityLogController::class, 'index'])->name('activity.index');

        // POS Settings
        Route::resource('sell-out-field-settings', \App\Http\Controllers\Admin\SellOutFieldSettingController::class)
            ->only(['index', 'store', 'update', 'destroy']);

        Route::get('billing', function () {
            $stores = \App\Models\Store::orderBy('name')->get()->map(fn ($store) => [
                'id' => $store->id,
                'name' => $store->name,
                'slug' => $store->slug,
                'planTier' => $store->plan,
                'monthlyRate' => (float) $store->monthly_fee,
                'status' => $store->subscription_status->value,
                'nextRenewal' => $store->trial_ends_at ? $store->trial_ends_at->toDateString() : 'Active',
            ]);
            return inertia('admin/billing', ['stores' => $stores]);
        })->name('billing');

        // Settings
        Route::get('settings', [SettingsController::class, 'index'])->name('settings');
        Route::patch('settings/profile', [SettingsController::class, 'updateProfile'])->name('settings.profile');
        Route::put('settings/password', [SettingsController::class, 'updatePassword'])->name('settings.password');
    });
});

