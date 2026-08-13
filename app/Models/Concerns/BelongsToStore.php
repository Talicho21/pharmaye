<?php

namespace App\Models\Concerns;

use App\Models\Scopes\StoreScope;
use App\Models\Store;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

trait BelongsToStore
{
    public static function bootBelongsToStore(): void
    {
        static::addGlobalScope(new StoreScope);

        // Auto-assign the tenant on create so controllers never have to.
        static::creating(function (Model $model): void {
            if ($model->getAttribute('store_id') === null && Auth::user()?->store_id !== null) {
                $model->setAttribute('store_id', Auth::user()->store_id);
            }
        });
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
