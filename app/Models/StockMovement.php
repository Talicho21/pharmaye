<?php

namespace App\Models;

use App\Enums\MovementType;
use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class StockMovement extends Model
{
    /** @use HasFactory<\Database\Factories\StockMovementFactory> */
    use BelongsToStore, HasFactory;

    protected $fillable = [
        'store_id',
        'batch_id',
        'type',
        'quantity',
        'reason',
        'reference_type',
        'reference_id',
        'user_id',
    ];

    protected function casts(): array
    {
        return [
            'type' => MovementType::class,
            'quantity' => 'integer',
        ];
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reference(): MorphTo
    {
        return $this->morphTo();
    }
}
