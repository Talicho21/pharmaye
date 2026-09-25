<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Clear global configurations
        DB::table('sell_out_field_configs')->truncate();

        Schema::table('sell_out_field_configs', function (Blueprint $table) {
            if (!Schema::hasColumn('sell_out_field_configs', 'store_id')) {
                $table->foreignId('store_id')->after('id')->constrained()->cascadeOnDelete();
            }
            $table->dropUnique(['field_key']);
            $table->unique(['store_id', 'field_key']);
        });

        // Seed defaults per store
        $stores = DB::table('stores')->get();
        $defaults = [
            // Customer Information
            ['section' => 'customer_information', 'field_key' => 'customer_name', 'label' => 'Customer Name', 'input_type' => 'text', 'is_required' => true, 'is_active' => true, 'sort_order' => 1],
            ['section' => 'customer_information', 'field_key' => 'customer_tin', 'label' => 'TIN Number', 'input_type' => 'text', 'is_required' => true, 'is_active' => true, 'sort_order' => 2],
            ['section' => 'customer_information', 'field_key' => 'invoice_no', 'label' => 'Invoice No', 'input_type' => 'text', 'is_required' => false, 'is_active' => true, 'sort_order' => 3],
            ['section' => 'customer_information', 'field_key' => 'customer_sno', 'label' => 'S.No', 'input_type' => 'text', 'is_required' => false, 'is_active' => true, 'sort_order' => 4],
            ['section' => 'customer_information', 'field_key' => 'reference', 'label' => 'Reference', 'input_type' => 'text', 'is_required' => false, 'is_active' => true, 'sort_order' => 5],
            ['section' => 'customer_information', 'field_key' => 'seller_name', 'label' => 'Seller Name', 'input_type' => 'text', 'is_required' => false, 'is_active' => true, 'sort_order' => 6],
            // Cash/Credit
            ['section' => 'cash_credit', 'field_key' => 'payment_method', 'label' => 'Payment Method', 'input_type' => 'dropdown', 'is_required' => true, 'is_active' => true, 'sort_order' => 1],
        ];

        $inserts = [];
        foreach ($stores as $store) {
            foreach ($defaults as $default) {
                $inserts[] = array_merge(['store_id' => $store->id, 'created_at' => now(), 'updated_at' => now()], $default);
            }
        }
        
        if (!empty($inserts)) {
            DB::table('sell_out_field_configs')->insert($inserts);
        }
    }

    public function down(): void
    {
        Schema::table('sell_out_field_configs', function (Blueprint $table) {
            $table->dropForeign(['store_id']);
            $table->dropColumn('store_id');
        });
    }
};
