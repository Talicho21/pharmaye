<?php

namespace App\Models;

use App\Models\Scopes\StoreOrGlobalScope;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Auth;

class Category extends Model
{
    /** @use HasFactory<\Database\Factories\CategoryFactory> */
    use HasFactory, SoftDeletes;

    /**
     * Shared pharmacy categories visible to every store (store_id is null).
     *
     * @var list<string>
     */
    public const DEFAULTS = [
        'Antibiotics & Antivirals',
        'Cardiovascular Medicines',
        'Inhalers & Respiratory Care',
        'Injections & IV Fluids',
        'Medical Supplies & Disposables',
        'Ointments, Creams & Gels',
        'Supplements & Vitamins',
        'Surgical & Wound Care',
        'Syrups & Oral Liquids',
        'Tablets & Capsules',
    ];

    protected $fillable = [
        'store_id',
        'name',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new StoreOrGlobalScope);

        static::creating(function (Category $model): void {
            if (array_key_exists('store_id', $model->getAttributes())) {
                return;
            }

            if (Auth::user()?->store_id !== null) {
                $model->setAttribute('store_id', Auth::user()->store_id);
            }
        });
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function medicines(): HasMany
    {
        return $this->hasMany(Medicine::class);
    }

    public function isGlobal(): bool
    {
        return $this->store_id === null;
    }
}
