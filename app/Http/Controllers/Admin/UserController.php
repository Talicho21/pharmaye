<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\TemporaryPasswordMail;
use App\Models\Store;
use App\Models\User;
use App\Services\AdminActivityLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
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
        ]);
    }

    public function resetPassword(User $user): RedirectResponse
    {
        $plain = Str::password(12, symbols: false);

        // The User model has 'password' => 'hashed' in its casts(), so the
        // model will hash $plain automatically — do NOT call Hash::make() here.
        $user->update([
            'password'              => $plain,
            'force_password_change' => true,
        ]);

        $this->logger->record('user.password_reset', $user, [
            'name'     => $user->name,
            'email'    => $user->email,
            'store_id' => $user->store_id,
        ]);

        try {
            Mail::to($user->email)->send(
                new TemporaryPasswordMail($user, $plain)
            );
        } catch (\Throwable $e) {
            // Password was already reset; warn the admin that the email failed
            // so they can communicate the credentials another way.
            report($e);

            return back()->with(
                'error',
                "Password reset for {$user->email}, but the notification email could not be sent. "
                . 'Please share the temporary password with the user manually, or reset again once mail is configured.',
            );
        }

        return back()->with(
            'success',
            "Password reset for {$user->email}. A temporary password has been sent to their email address.",
        );
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
