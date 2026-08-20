<?php

namespace App\Models;

use App\Enums\SubscriptionStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Store extends Model
{
    /** @use HasFactory<\Database\Factories\StoreFactory> */
    use HasFactory;

    protected $fillable = [
        'slug',
        'name',
        'address',
        'phone',
        'logo_path',
        'subscription_status',
        'plan',
        'monthly_fee',
        'trial_ends_at',
    ];

    protected function casts(): array
    {
        return [
            'subscription_status' => SubscriptionStatus::class,
            'monthly_fee' => 'decimal:2',
            'trial_ends_at' => 'date',
        ];
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }

    public function batches(): HasMany
    {
        return $this->hasMany(Batch::class);
    }

    public function medicines(): HasMany
    {
        return $this->hasMany(Medicine::class);
    }
}
