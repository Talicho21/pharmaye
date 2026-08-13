<?php

namespace App\Models;

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
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}
