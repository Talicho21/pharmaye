<?php

namespace Database\Seeders;

use App\Enums\UserRole;
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
        $store = Store::query()->firstOrCreate(
            ['slug' => 'hawan-drug-store'],
            [
                'name' => 'Hawan Drug Store',
                'address' => 'Addis Ababa, Ethiopia',
                'phone' => '092180070',
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
    }
}
