<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\UseAdminGuard;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->redirectGuestsTo(function (Request $request) {
            return $request->is('admin') || $request->is('admin/*')
                ? route('admin.login')
                : route('login');
        });

        $middleware->redirectUsersTo(function (Request $request) {
            return $request->is('admin') || $request->is('admin/*')
                ? route('admin.dashboard')
                : route('dashboard');
        });

        $middleware->alias([
            'store.selected' => \App\Http\Middleware\EnsureStoreSelected::class,
            'admin' => \App\Http\Middleware\EnsureUserIsAdmin::class,
            'admin.guard' => UseAdminGuard::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
