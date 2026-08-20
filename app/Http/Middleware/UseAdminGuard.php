<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Makes the platform-admin guard the default for this request so Auth::user()
 * is a PlatformAdmin (no store_id). StoreScope then no-ops because it only
 * filters when the default-guard user has a store_id — tenant login and the
 * scope class itself are left unchanged.
 */
class UseAdminGuard
{
    public function handle(Request $request, Closure $next): Response
    {
        Auth::shouldUse('admin');

        return $next($request);
    }
}
