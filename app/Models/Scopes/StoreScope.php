<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

/**
 * Restricts every query to the authenticated user's store. Applied as a
 * global scope so tenant isolation cannot be forgotten on individual queries.
 *
 * Unauthenticated contexts (console commands, the data-migration importer)
 * are intentionally unscoped and must set store_id explicitly.
 */
class StoreScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $storeId = Auth::user()?->store_id;

        if ($storeId !== null) {
            $builder->where($model->qualifyColumn('store_id'), $storeId);
        }
    }
}
