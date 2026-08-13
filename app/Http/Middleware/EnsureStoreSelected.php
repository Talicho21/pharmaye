<?php

namespace App\Http\Middleware;

use App\Models\Store;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Guards the login routes: a store must be selected (via /find-store)
 * before the branded, store-scoped login page is reachable.
 */
class EnsureStoreSelected
{
    public function handle(Request $request, Closure $next): Response
    {
        $storeId = $request->session()->get('store_id');

        if ($storeId === null || ! Store::query()->whereKey($storeId)->exists()) {
            $request->session()->forget('store_id');

            return redirect()->route('store.find');
        }

        return $next($request);
    }
}
