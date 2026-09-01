<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('admin/settings', [
            'status' => $request->session()->get('status'),
        ]);
    }

    public function updateProfile(Request $request): RedirectResponse
    {
        $admin = $request->user('admin');

        $validated = $request->validate([
            'name'  => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:platform_admins,email,' . $admin->id],
        ]);

        $admin->update($validated);

        return back()->with('status', 'profile-updated');
    }

    public function updatePassword(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password:admin'],
            'password'         => ['required', Password::defaults(), 'confirmed'],
        ]);

        $request->user('admin')->update([
            'password' => $validated['password'],
        ]);

        return back()->with('status', 'password-updated');
    }
}
