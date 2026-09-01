<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\User;
use App\Services\AdminActivityLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function __construct(private readonly AdminActivityLogger $logger) {}

    public function index(Request $request): Response
    {
        $storeId = $request->integer('store_id') ?: null;
        $search = trim((string) $request->query('search', ''));

        $users = User::query()
            ->with('store:id,name,slug')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->when($search !== '', function ($q) use ($search) {
                $like = '%'.mb_strtolower($search).'%';
                $q->where(function ($inner) use ($like) {
                    $inner->whereRaw('lower(name) like ?', [$like])
                        ->orWhereRaw('lower(email) like ?', [$like]);
                });
            })
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role->value,
                'deactivated_at' => $user->deactivated_at?->toIso8601String(),
                'store' => $user->store ? [
                    'id' => $user->store->id,
                    'name' => $user->store->name,
                    'slug' => $user->store->slug,
                ] : null,
            ]);

        return Inertia::render('admin/users/index', [
            'users' => $users,
            'stores' => Store::query()->orderBy('name')->get(['id', 'name', 'slug']),
            'filters' => [
                'search' => $search,
                'store_id' => $storeId,
            ],
            'generated_password' => $request->session()->get('generated_password'),
        ]);
    }

    public function resetPassword(User $user): RedirectResponse
    {
        $plain = Str::password(12, symbols: false);

        $user->update([
            'password'               => $plain,
            'force_password_change'  => true,
        ]);

        $this->logger->record('user.password_reset', $user, [
            'name' => $user->name,
            'email' => $user->email,
            'store_id' => $user->store_id,
        ]);

        return back()->with([
            'success' => "Password reset for {$user->email}.",
            'generated_password' => $plain,
        ]);
    }

    public function deactivate(User $user): RedirectResponse
    {
        $user->update(['deactivated_at' => now()]);

        $this->logger->record('user.deactivated', $user, [
            'name' => $user->name,
            'email' => $user->email,
            'store_id' => $user->store_id,
        ]);

        return back()->with('success', "{$user->email} has been deactivated.");
    }

    public function activate(User $user): RedirectResponse
    {
        $user->update(['deactivated_at' => null]);

        $this->logger->record('user.activated', $user, [
            'name' => $user->name,
            'email' => $user->email,
            'store_id' => $user->store_id,
        ]);

        return back()->with('success', "{$user->email} has been reactivated.");
    }
}
