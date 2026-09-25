<?php

use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\SaleController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    if (auth('admin')->check()) {
        return redirect()->route('admin.dashboard');
    }

    return auth()->check()
        ? redirect()->route('dashboard')
        : redirect()->route('store.find');
})->name('home');

Route::middleware(['auth', 'require.password.change', 'store.not_suspended'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // POS
    Route::get('sell-out', [SaleController::class, 'create'])->name('sell-out');
    Route::post('sales', [SaleController::class, 'store'])->name('sales.store');

    Route::get('inventory', [InventoryController::class, 'index'])->name('inventory.index');
    Route::get('stock-entry', [InventoryController::class, 'create'])->name('stock-entry');
    Route::post('stock-entry', [InventoryController::class, 'store'])->name('batches.store');
    Route::put('batches/{batch}', [InventoryController::class, 'update'])->name('batches.update');

    Route::post('categories', [CategoryController::class, 'store'])->name('categories.store');
    
    Route::get('reports', [AnalyticsController::class, 'index'])->name('reports');

    // Admin only
    Route::middleware('admin')->group(function () {
        Route::delete('batches/{batch}', [InventoryController::class, 'destroy'])->name('batches.destroy');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
require __DIR__.'/admin.php';
