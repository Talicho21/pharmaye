<?php

namespace App\Http\Middleware;

use App\Enums\SubscriptionStatus;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Enforces store suspension on every authenticated request.
 *
 * Exemptions:
 *   - Unauthenticated requests (let the auth middleware handle them).
 *   - Platform-admin sessions (auth.guard = "admin", no store_id).
 *   - The logout route (so a suspended user can always sign out).
 *
 * Store status is read from the database on every request - never
 * from a cached token - so suspension takes effect immediately.
 */
class EnsureStoreNotSuspended
{
    public function handle(Request $request, Closure $next): Response
    {
        // Pass through unauthenticated requests (the auth middleware handles them).
        $user = $request->user('web');
        if ($user === null) {
            return $next($request);
        }

        // Platform-admin sessions have no store; never block them.
        if (auth('admin')->check()) {
            return $next($request);
        }

        // Always allow the logout route so the user can sign out while suspended.
        if ($request->routeIs('logout')) {
            return $next($request);
        }

        // Read store status live from DB (fail closed: missing store = suspended).
        $store = $user->store;

        $isSuspended = $store === null
            || $store->subscription_status === SubscriptionStatus::Suspended;

        if (! $isSuspended) {
            return $next($request);
        }

        // For Inertia XHR requests, return a JSON 403 so the frontend
        // fetch layer can intercept it and navigate to /store-suspended.
        if ($request->header('X-Inertia')) {
            return response()->json(
                ['error' => 'STORE_SUSPENDED', 'message' => 'This store has been suspended.'],
                Response::HTTP_FORBIDDEN
            );
        }

        return redirect()->route('store.suspended');
    }
}
