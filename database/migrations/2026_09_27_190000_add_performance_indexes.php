<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('batches', function (Blueprint $table) {
            $table->index(['store_id', 'medicine_id'], 'batches_store_id_medicine_id_idx');
            $table->index(['medicine_id', 'quantity', 'expiry_date'], 'batches_medicine_fefo_idx');
        });

        Schema::table('medicines', function (Blueprint $table) {
            $table->index(['store_id', 'category_id'], 'medicines_store_category_idx');
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->index(['store_id', 'created_at'], 'stock_movements_store_created_idx');
        });
    }

    public function down(): void
    {
        Schema::table('batches', function (Blueprint $table) {
            $table->dropIndex('batches_store_id_medicine_id_idx');
            $table->dropIndex('batches_medicine_fefo_idx');
        });

        Schema::table('medicines', function (Blueprint $table) {
            $table->dropIndex('medicines_store_category_idx');
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropIndex('stock_movements_store_created_idx');
        });
    }
};
