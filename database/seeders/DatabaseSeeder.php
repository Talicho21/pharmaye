<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Category;
use App\Models\PlatformAdmin;
use App\Models\Store;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        foreach (Category::DEFAULTS as $name) {
            Category::query()->firstOrCreate(
                ['store_id' => null, 'name' => $name],
            );
        }

        $store = Store::query()->firstOrCreate(
            ['slug' => 'hawan-drug-store'],
            [
                'name' => 'Hawan Drug Store',
                'address' => 'Addis Ababa, Ethiopia',
                'phone' => '092180070',
                'subscription_status' => 'active',
                'plan' => 'standard',
                'monthly_fee' => 1500,
                'trial_ends_at' => now()->addDays(14),
            ],
        );

        User::query()->firstOrCreate(
            ['store_id' => $store->id, 'email' => 'admin@hawan.local'],
            [
                'name' => 'Hawan Admin',
                'password' => Hash::make('change-me-now'),
                'role' => UserRole::Admin,
                'email_verified_at' => now(),
            ],
        );

        User::query()->firstOrCreate(
            ['store_id' => $store->id, 'email' => 'staff@hawan.local'],
            [
                'name' => 'Hawan Staff',
                'password' => Hash::make('change-me-now'),
                'role' => UserRole::Staff,
                'email_verified_at' => now(),
            ],
        );

        PlatformAdmin::query()->firstOrCreate(
            ['email' => 'owner@pharmaye.local'],
            [
                'name' => 'Pharmaye Owner',
                'password' => Hash::make('change-me-now'),
            ],
        );
    }
}
