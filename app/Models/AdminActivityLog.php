<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdminActivityLog extends Model
{
    /** @use HasFactory<\Database\Factories\AdminActivityLogFactory> */
    use HasFactory;

    protected $fillable = [
        'platform_admin_id',
        'action',
        'target_type',
        'target_id',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
        ];
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(PlatformAdmin::class, 'platform_admin_id');
    }

    public function description(): string
    {
        $name = $this->meta['name'] ?? $this->meta['email'] ?? ('#'.$this->target_id);

        return match ($this->action) {
            'store.created' => "Created store {$name}",
            'store.updated' => "Updated store {$name}",
            'store.suspended' => "Suspended store {$name}",
            'store.activated' => "Activated store {$name}",
            'user.password_reset' => "Reset password for {$name}",
            'user.deactivated' => "Deactivated user {$name}",
            'user.activated' => "Reactivated user {$name}",
            default => str_replace('.', ' ', $this->action).' '.$name,
        };
    }
}
