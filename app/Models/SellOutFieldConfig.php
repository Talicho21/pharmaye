<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SellOutFieldConfig extends Model
{
    protected $fillable = [
        'store_id',
        'section',
        'field_key',
        'label',
        'input_type',
        'is_required',
        'is_active',
        'sort_order',
    ];

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    protected function casts(): array
    {
        return [
            'is_required' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }
}
