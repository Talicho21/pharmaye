<?php

namespace App\Services;

use App\Models\AdminActivityLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class AdminActivityLogger
{
    /**
     * @param  array<string, mixed>  $meta
     */
    public function record(string $action, ?Model $target = null, array $meta = []): AdminActivityLog
    {
        $admin = Auth::guard('admin')->user();

        return AdminActivityLog::query()->create([
            'platform_admin_id' => $admin?->getAuthIdentifier(),
            'action' => $action,
            'target_type' => $target ? $target::class : null,
            'target_id' => $target?->getKey(),
            'meta' => $meta,
        ]);
    }
}
