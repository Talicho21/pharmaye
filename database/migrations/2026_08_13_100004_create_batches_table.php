<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('medicine_id')->constrained()->restrictOnDelete();
            $table->foreignId('supplier_id')->nullable()->constrained()->nullOnDelete();
            $table->string('batch_number');
            $table->unsignedInteger('quantity');
            $table->unsignedInteger('initial_quantity');
            $table->decimal('unit_cost', 10, 2)->default(0);
            $table->date('expiry_date');
            $table->timestamp('received_at')->nullable();
            $table->timestamps();

            // Fast FEFO lookups: earliest expiry within a store.
            $table->index(['store_id', 'expiry_date']);
            $table->unique(['store_id', 'batch_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('batches');
    }
};
