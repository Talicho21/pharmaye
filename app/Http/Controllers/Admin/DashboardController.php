<?php

namespace App\Http\Controllers\Admin;

use App\Enums\SubscriptionStatus;
use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Models\Scopes\StoreScope;
use App\Models\Store;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $counts = Store::query()
            ->selectRaw('subscription_status, count(*) as total')
            ->groupBy('subscription_status')
            ->pluck('total', 'subscription_status');

        $mrr = (float) Store::query()
            ->where('subscription_status', SubscriptionStatus::Active)
            ->sum('monthly_fee');

        $overdue = Store::query()
            ->where('subscription_status', SubscriptionStatus::Overdue)
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'subscription_status', 'plan']);

        $trialsEnding = Store::query()
            ->where('subscription_status', SubscriptionStatus::Trial)
            ->whereDate('trial_ends_at', '<=', now()->addDays(7))
            ->whereDate('trial_ends_at', '>=', now()->toDateString())
            ->orderBy('trial_ends_at')
            ->get(['id', 'name', 'slug', 'subscription_status', 'plan', 'trial_ends_at']);

        $monthStart = now()->startOfMonth();
        $revenues = Sale::withoutGlobalScope(StoreScope::class)
            ->where('created_at', '>=', $monthStart)
            ->selectRaw('store_id, coalesce(sum(total_amount), 0) as revenue')
            ->groupBy('store_id')
            ->pluck('revenue', 'store_id');

        $stores = Store::query()
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Store $store): array => [
                'id' => $store->id,
                'name' => $store->name,
                'slug' => $store->slug,
                'plan' => $store->plan,
                'subscription_status' => $store->subscription_status->value,
                'monthly_fee' => (float) $store->monthly_fee,
                'this_month_revenue' => (float) ($revenues[$store->id] ?? 0),
            ]);

        return Inertia::render('admin/dashboard', [
            'kpis' => [
                'total_stores' => Store::query()->count(),
                'active' => (int) ($counts[SubscriptionStatus::Active->value] ?? 0),
                'trial' => (int) ($counts[SubscriptionStatus::Trial->value] ?? 0),
                'overdue' => (int) ($counts[SubscriptionStatus::Overdue->value] ?? 0),
                'suspended' => (int) ($counts[SubscriptionStatus::Suspended->value] ?? 0),
                'mrr' => $mrr,
            ],
            'attention' => [
                'overdue' => $overdue,
                'trials_ending' => $trialsEnding->map(fn (Store $store): array => [
                    'id' => $store->id,
                    'name' => $store->name,
                    'slug' => $store->slug,
                    'trial_ends_at' => $store->trial_ends_at?->toDateString(),
                ]),
            ],
            'stores' => $stores,
        ]);
    }
}
