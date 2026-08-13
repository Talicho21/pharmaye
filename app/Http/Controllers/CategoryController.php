<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $name = trim($validated['name']);

        $exists = Category::query()
            ->whereRaw('lower(name) = ?', [mb_strtolower($name)])
            ->exists();

        if ($exists) {
            return back()->withErrors(['name' => 'This category already exists.']);
        }

        Category::query()->create(['name' => $name]);

        return back()->with('success', 'Category created.');
    }
}
