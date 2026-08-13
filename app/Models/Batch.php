<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Batch extends Model
{
    /** @use HasFactory<\Database\Factories\BatchFactory> */
    use BelongsToStore, HasFactory;

    protected $fillable = [
        'store_id',
        'medicine_id',
        'supplier_id',
        'batch_number',
        'quantity',
        'initial_quantity',
        'unit_cost',
        'expiry_date',
        'received_at',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'initial_quantity' => 'integer',
            'unit_cost' => 'decimal:2',
            'expiry_date' => 'date',
            'received_at' => 'datetime',
        ];
    }

    public function medicine(): BelongsTo
    {
        return $this->belongsTo(Medicine::class)->withTrashed();
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function isExpired(): bool
    {
        return $this->expiry_date->isPast();
    }
}
