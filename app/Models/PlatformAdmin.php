<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * Platform owner account. Lives outside tenant users and has no store_id,
 * so StoreScope cannot apply to it.
 */
class PlatformAdmin extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\PlatformAdminFactory> */
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
        ];
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(AdminActivityLog::class);
    }
}
