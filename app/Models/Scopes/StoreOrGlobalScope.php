<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

/**
 * Tenant rows for the authenticated store, plus shared rows (store_id null).
 * Used by Category so every pharmacy sees the common list and only its own extras.
 */
class StoreOrGlobalScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $storeId = Auth::user()?->store_id;

        if ($storeId === null) {
            return;
        }

        $column = $model->qualifyColumn('store_id');

        $builder->where(function (Builder $query) use ($column, $storeId): void {
            $query->where($column, $storeId)->orWhereNull($column);
        });
    }
}
