<?php

namespace App\Http\Middleware;

use App\Enums\SubscriptionStatus;
use App\Models\Store;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    private ?Store $resolvedStore = null;
    private bool $hasResolvedStore = false;

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return array_merge(parent::share($request), [
            'name' => config('app.name'),
            'quote' => fn () => [
                'message' => trim(str(Inspiring::quotes()->random())->before('-')),
                'author' => trim(str(Inspiring::quotes()->random())->after('-')),
            ],
            'auth' => [
                'user' => $request->user('web'),
                'admin' => $request->user('admin'),
            ],
            // Store branding for every page: the login page renders the store
            // selected via /find-store; authenticated pages render the user's.
            'store' => fn (): ?array => $this->resolveStoreBranding($request),
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'receipt' => fn () => $request->session()->get('receipt'),
                'generated_password' => fn () => $request->session()->get('generated_password'),
            ],
            'store_suspended' => fn (): bool => $this->isStoreSuspended($request),
        ]);
    }

    /**
     * Resolve the store once per request without duplicate DB queries.
     */
    private function getStore(Request $request): ?Store
    {
        if ($this->hasResolvedStore) {
            return $this->resolvedStore;
        }

        $this->hasResolvedStore = true;
        $this->resolvedStore = $request->user('web')?->store;

        if ($this->resolvedStore === null && $request->hasSession() && $request->session()->has('store_id')) {
            $this->resolvedStore = Store::find($request->session()->get('store_id'));
        }

        return $this->resolvedStore;
    }

    /**
     * @return array{name: string, slug: string, phone: string|null, address: string|null, logo_url: string|null}|null
     */
    private function resolveStoreBranding(Request $request): ?array
    {
        $store = $this->getStore($request);

        if ($store === null) {
            return null;
        }

        return [
            'name' => $store->name,
            'slug' => $store->slug,
            'phone' => $store->phone,
            'address' => $store->address,
            'logo_url' => $store->logo_path ? asset('storage/'.$store->logo_path) : null,
        ];
    }

    /**
     * Returns true when the authenticated store user's store is suspended (or missing).
     */
    private function isStoreSuspended(Request $request): bool
    {
        $user = $request->user('web');
        if ($user === null) {
            return false;
        }

        $store = $this->getStore($request);

        return $store === null
            || $store->subscription_status === SubscriptionStatus::Suspended;
    }
}
