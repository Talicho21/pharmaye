<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Store;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class StoreSelectionController extends Controller
{
    private const COOKIE_NAME = 'last_store_slug';

    private const COOKIE_MINUTES = 60 * 24 * 365; // 1 year

    /**
     * Show the store code entry page. If a previous visit left a valid
     * last_store_slug cookie, pre-fill the code so the user need not retype it.
     */
    public function show(Request $request): Response
    {
        $prefill = null;

        if ($slug = $request->cookie(self::COOKIE_NAME)) {
            $prefill = $this->resolveStore($slug)?->slug;
        }

        return Inertia::render('auth/find-store', [
            'prefillCode' => $prefill,
        ]);
    }

    /**
     * Resolve the submitted store code and stash it in the session.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:100'],
        ]);

        $store = $this->resolveStore($validated['code']);

        if ($store === null) {
            // A single generic message: never leak whether similar codes exist.
            throw ValidationException::withMessages([
                'code' => __('Store not found.'),
            ]);
        }

        $request->session()->put('store_id', $store->id);

        return redirect()->route('login')
            ->withCookie(cookie(self::COOKIE_NAME, $store->slug, self::COOKIE_MINUTES));
    }

    private function resolveStore(string $code): ?Store
    {
        // whereRaw(lower(...)) keeps the lookup case-insensitive on every
        // driver (MySQL CI collation, but sqlite in tests is case-sensitive).
        return Store::query()
            ->whereRaw('lower(slug) = ?', [mb_strtolower(trim($code))])
            ->first();
    }
}
