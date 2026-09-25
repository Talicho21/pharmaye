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
        Schema::create('sell_out_field_configs', function (Blueprint $table) {
            $table->id();
            $table->string('section', 50); // checkout, order_summary, customer_information, cash_credit
            $table->string('field_key', 50)->unique();
            $table->string('label');
            $table->string('input_type', 20)->default('text'); // text, number, date, dropdown
            $table->boolean('is_required')->default(false);
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->json('meta')->nullable()->after('payment_method');
        });

        // Seed default fields
        DB::table('sell_out_field_configs')->insert([
            // Customer Information
            ['section' => 'customer_information', 'field_key' => 'customer_name', 'label' => 'Customer Name', 'input_type' => 'text', 'is_required' => true, 'is_active' => true, 'sort_order' => 1],
            ['section' => 'customer_information', 'field_key' => 'customer_tin', 'label' => 'TIN Number', 'input_type' => 'text', 'is_required' => true, 'is_active' => true, 'sort_order' => 2],
            ['section' => 'customer_information', 'field_key' => 'invoice_no', 'label' => 'Invoice No', 'input_type' => 'text', 'is_required' => false, 'is_active' => true, 'sort_order' => 3],
            ['section' => 'customer_information', 'field_key' => 'customer_sno', 'label' => 'S.No', 'input_type' => 'text', 'is_required' => false, 'is_active' => true, 'sort_order' => 4],
            ['section' => 'customer_information', 'field_key' => 'reference', 'label' => 'Reference', 'input_type' => 'text', 'is_required' => false, 'is_active' => true, 'sort_order' => 5],
            ['section' => 'customer_information', 'field_key' => 'seller_name', 'label' => 'Seller Name', 'input_type' => 'text', 'is_required' => false, 'is_active' => true, 'sort_order' => 6],
            // Cash/Credit
            ['section' => 'cash_credit', 'field_key' => 'payment_method', 'label' => 'Payment Method', 'input_type' => 'dropdown', 'is_required' => true, 'is_active' => true, 'sort_order' => 1],
        ]);
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn('meta');
        });
        Schema::dropIfExists('sell_out_field_configs');
    }
};
