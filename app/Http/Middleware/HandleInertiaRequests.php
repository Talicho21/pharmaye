<?php

namespace App\Http\Middleware;

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

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        return array_merge(parent::share($request), [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $request->user(),
            ],
            // Store branding for every page: the login page renders the store
            // selected via /find-store; authenticated pages render the user's.
            'store' => fn (): ?array => $this->resolveStoreBranding($request),
        ]);
    }

    /**
     * @return array{name: string, slug: string, logo_url: string|null}|null
     */
    private function resolveStoreBranding(Request $request): ?array
    {
        $store = $request->user()?->store;

        if ($store === null && $request->hasSession() && $request->session()->has('store_id')) {
            $store = Store::find($request->session()->get('store_id'));
        }

        if ($store === null) {
            return null;
        }

        return [
            'name' => $store->name,
            'slug' => $store->slug,
            'logo_url' => $store->logo_path ? asset('storage/'.$store->logo_path) : null,
        ];
    }
}
