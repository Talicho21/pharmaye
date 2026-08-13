<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medicines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('generic_name')->nullable();
            $table->enum('unit', [
                'tablet', 'capsule', 'bottle', 'box', 'vial', 'ampoule',
                'sachet', 'strip', 'tube', 'pack', 'piece', 'other',
            ])->default('piece');
            $table->unsignedInteger('units_per_box')->nullable();
            $table->decimal('default_price', 10, 2)->default(0);
            $table->unsignedInteger('reorder_level')->default(10);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['store_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medicines');
    }
};
