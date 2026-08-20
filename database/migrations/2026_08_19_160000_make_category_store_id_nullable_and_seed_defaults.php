<?php

use App\Models\Category;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->dropForeign(['store_id']);
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->unsignedBigInteger('store_id')->nullable()->change();
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->foreign('store_id')->references('id')->on('stores')->cascadeOnDelete();
        });

        $now = now();

        foreach (Category::DEFAULTS as $name) {
            $exists = DB::table('categories')
                ->whereNull('store_id')
                ->whereNull('deleted_at')
                ->whereRaw('lower(name) = ?', [mb_strtolower($name)])
                ->exists();

            if ($exists) {
                continue;
            }

            DB::table('categories')->insert([
                'store_id' => null,
                'name' => $name,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        $globals = DB::table('categories')
            ->whereNull('store_id')
            ->whereNull('deleted_at')
            ->get();

        foreach ($globals as $global) {
            $duplicates = DB::table('categories')
                ->whereNotNull('store_id')
                ->whereNull('deleted_at')
                ->whereRaw('lower(name) = ?', [mb_strtolower($global->name)])
                ->get();

            foreach ($duplicates as $duplicate) {
                DB::table('medicines')
                    ->where('category_id', $duplicate->id)
                    ->update(['category_id' => $global->id]);

                DB::table('categories')
                    ->where('id', $duplicate->id)
                    ->update([
                        'deleted_at' => $now,
                        'updated_at' => $now,
                    ]);
            }
        }
    }

    public function down(): void
    {
        DB::table('categories')->whereNull('store_id')->delete();

        Schema::table('categories', function (Blueprint $table) {
            $table->dropForeign(['store_id']);
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->unsignedBigInteger('store_id')->nullable(false)->change();
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->foreign('store_id')->references('id')->on('stores')->cascadeOnDelete();
        });
    }
};
