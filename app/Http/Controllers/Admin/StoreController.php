<?php

namespace App\Http\Controllers\Admin;

use App\Enums\SubscriptionStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreStoreRequest;
use App\Http\Requests\Admin\UpdateStoreRequest;
use App\Models\Batch;
use App\Models\Medicine;
use App\Models\Sale;
use App\Models\Scopes\StoreScope;
use App\Models\Store;
use App\Models\User;
use App\Services\AdminActivityLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class StoreController extends Controller
{
    public function __construct(private readonly AdminActivityLogger $logger) {}

    public function index(Request $request): Response
    {
        $status = $request->query('status');
        $search = trim((string) $request->query('search', ''));

        $monthStart = now()->startOfMonth();
        $revenues = Sale::withoutGlobalScope(StoreScope::class)
            ->where('created_at', '>=', $monthStart)
            ->selectRaw('store_id, coalesce(sum(total_amount), 0) as revenue')
            ->groupBy('store_id')
            ->pluck('revenue', 'store_id');

        $stores = Store::query()
            ->when($status, fn ($q) => $q->where('subscription_status', $status))
            ->when($search !== '', function ($q) use ($search) {
                $like = '%'.mb_strtolower($search).'%';
                $q->where(function ($inner) use ($like) {
                    $inner->whereRaw('lower(name) like ?', [$like])
                        ->orWhereRaw('lower(slug) like ?', [$like]);
                });
            })
            ->orderBy('name')
            ->paginate(15)
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

        return Inertia::render('admin/stores/index', [
            'stores' => $stores,
            'filters' => [
                'search' => $search,
                'status' => $status,
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/stores/create', [
            'statuses' => array_column(SubscriptionStatus::cases(), 'value'),
        ]);
    }

    public function store(StoreStoreRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $slug = Str::slug($validated['slug'] ?: $validated['name']);

        if (Store::query()->where('slug', $slug)->exists()) {
            $slug .= '-'.Str::lower(Str::random(4));
        }

        $store = DB::transaction(function () use ($validated, $slug): Store {
            $store = Store::query()->create([
                'name' => $validated['name'],
                'slug' => $slug,
                'address' => $validated['address'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'plan' => $validated['plan'],
                'monthly_fee' => $validated['monthly_fee'],
                'subscription_status' => $validated['subscription_status'],
                'trial_ends_at' => $validated['trial_ends_at'] ?? now()->addDays(14),
            ]);

            User::query()->create([
                'store_id' => $store->id,
                'name' => $validated['admin_name'],
                'email' => $validated['admin_email'],
                'password' => $validated['admin_password'],
                'role' => UserRole::Admin,
                'email_verified_at' => now(),
            ]);

            return $store;
        });

        $this->logger->record('store.created', $store, [
            'name' => $store->name,
            'slug' => $store->slug,
        ]);

        return redirect()->route('admin.stores.show', $store)->with('success', "Store {$store->name} created.");
    }

    public function show(Store $store): Response
    {
        $monthStart = now()->startOfMonth();

        $salesThisMonth = (float) Sale::withoutGlobalScope(StoreScope::class)
            ->where('store_id', $store->id)
            ->where('created_at', '>=', $monthStart)
            ->sum('total_amount');

        $inventoryValue = (float) Batch::withoutGlobalScope(StoreScope::class)
            ->where('batches.store_id', $store->id)
            ->join('medicines', 'medicines.id', '=', 'batches.medicine_id')
            ->selectRaw('coalesce(sum(batches.quantity * medicines.default_price), 0) as value')
            ->value('value');

        $medicineCount = Medicine::withoutGlobalScope(StoreScope::class)
            ->where('store_id', $store->id)
            ->count();

        $users = $store->users()->orderBy('name')->get(['id', 'name', 'email', 'role', 'deactivated_at', 'created_at']);

        return Inertia::render('admin/stores/show', [
            'store' => [
                'id' => $store->id,
                'name' => $store->name,
                'slug' => $store->slug,
                'address' => $store->address,
                'phone' => $store->phone,
                'logo_path' => $store->logo_path,
                'plan' => $store->plan,
                'monthly_fee' => (float) $store->monthly_fee,
                'subscription_status' => $store->subscription_status->value,
                'trial_ends_at' => $store->trial_ends_at?->toDateString(),
            ],
            'statuses' => array_column(SubscriptionStatus::cases(), 'value'),
            'users' => $users,
            'stats' => [
                'this_month_revenue' => $salesThisMonth,
                'inventory_value' => $inventoryValue,
                'medicine_count' => $medicineCount,
                'user_count' => $users->count(),
            ],
        ]);
    }

    public function update(UpdateStoreRequest $request, Store $store): RedirectResponse
    {
        $store->update($request->validated());

        $this->logger->record('store.updated', $store, [
            'name' => $store->name,
            'slug' => $store->slug,
        ]);

        return back()->with('success', 'Store updated.');
    }

    public function suspend(Store $store): RedirectResponse
    {
        $store->update(['subscription_status' => SubscriptionStatus::Suspended]);

        $this->logger->record('store.suspended', $store, [
            'name' => $store->name,
            'slug' => $store->slug,
        ]);

        return back()->with('success', "{$store->name} has been suspended.");
    }

    public function activate(Store $store): RedirectResponse
    {
        $store->update(['subscription_status' => SubscriptionStatus::Active]);

        $this->logger->record('store.activated', $store, [
            'name' => $store->name,
            'slug' => $store->slug,
        ]);

        return back()->with('success', "{$store->name} has been activated.");
    }

    public function destroy(Store $store): RedirectResponse
    {
        $name = $store->name;
        $slug = $store->slug;

        DB::transaction(function () use ($store) {
            // Delete leaf nodes that restrict parent deletion
            DB::table('stock_movements')->where('store_id', $store->id)->delete();
            
            $saleIds = $store->sales()->pluck('id');
            if ($saleIds->isNotEmpty()) {
                DB::table('sale_items')->whereIn('sale_id', $saleIds)->delete();
            }
            
            $store->sales()->delete();
            $store->batches()->delete();
            $store->medicines()->delete();
            
            DB::table('categories')->where('store_id', $store->id)->delete();
            DB::table('suppliers')->where('store_id', $store->id)->delete();
            $store->users()->delete();
            
            $store->delete();
        });

        $this->logger->record('store.deleted', null, [
            'name' => $name,
            'slug' => $slug,
        ]);

        return back()->with('success', "{$name} has been successfully deleted.");
    }
}
