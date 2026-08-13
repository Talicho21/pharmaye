<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales', function (Blueprint $table) {
            // UUID primary key: required for future offline POS sync.
            $table->uuid('id')->primary();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('invoice_no', 50);
            $table->string('customer_name')->nullable();
            $table->string('customer_tin', 50)->nullable();
            $table->string('customer_sno', 50)->nullable();
            $table->string('receiver_name')->nullable();
            $table->string('reference')->nullable();
            $table->decimal('subtotal', 10, 2)->default(0);
            $table->decimal('tax_amount', 10, 2)->default(0);
            $table->decimal('discount_amount', 10, 2)->default(0);
            $table->decimal('total_amount', 10, 2)->default(0);
            $table->string('payment_method', 16)->default('cash');
            $table->string('sync_status', 16)->default('synced');
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();

            // Not unique: legacy client-generated invoice numbers can repeat.
            $table->index(['store_id', 'invoice_no']);
            $table->index(['store_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales');
    }
};
