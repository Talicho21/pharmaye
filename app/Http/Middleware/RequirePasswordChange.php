<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Redirect authenticated store users to the password change page
 * if an admin has reset their password and forced a change.
 */
class RequirePasswordChange
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user('web');

        if ($user && $user->force_password_change) {
            // Allow the password change route itself (and its PUT) through,
            // so the user is never stuck in a redirect loop.
            if ($request->routeIs('password.edit', 'password.update')) {
                return $next($request);
            }

            return redirect()->route('password.edit')
                ->with('status', 'Please set a new password before continuing.')
                ->withSession(['_force_redirect_dashboard' => true]);
        }

        return $next($request);
    }
}
