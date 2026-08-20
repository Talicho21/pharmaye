<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->string('subscription_status', 20)->default('trial')->after('logo_path');
            $table->string('plan')->default('standard')->after('subscription_status');
            $table->decimal('monthly_fee', 10, 2)->default(0)->after('plan');
            $table->date('trial_ends_at')->nullable()->after('monthly_fee');
        });
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn(['subscription_status', 'plan', 'monthly_fee', 'trial_ends_at']);
        });
    }
};
