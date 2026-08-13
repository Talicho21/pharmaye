<?php

namespace App\Models;

use App\Enums\MedicineUnit;
use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Medicine extends Model
{
    /** @use HasFactory<\Database\Factories\MedicineFactory> */
    use BelongsToStore, HasFactory, SoftDeletes;

    protected $fillable = [
        'store_id',
        'category_id',
        'name',
        'generic_name',
        'unit',
        'units_per_box',
        'default_price',
        'reorder_level',
    ];

    protected function casts(): array
    {
        return [
            'unit' => MedicineUnit::class,
            'default_price' => 'decimal:2',
            'units_per_box' => 'integer',
            'reorder_level' => 'integer',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function batches(): HasMany
    {
        return $this->hasMany(Batch::class);
    }

    public function saleItems(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    /**
     * Batches that still hold stock, earliest expiry first (FEFO order).
     */
    public function sellableBatches(): HasMany
    {
        return $this->batches()
            ->where('quantity', '>', 0)
            ->orderBy('expiry_date')
            ->orderBy('id');
    }

    public function scopeLowStock(Builder $query): Builder
    {
        return $query->whereRaw(
            '(select coalesce(sum(quantity), 0) from batches where batches.medicine_id = medicines.id) <= medicines.reorder_level'
        );
    }
}
