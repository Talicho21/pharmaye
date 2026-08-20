<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminActivityLog;
use Inertia\Inertia;
use Inertia\Response;

class ActivityLogController extends Controller
{
    public function index(): Response
    {
        $logs = AdminActivityLog::query()
            ->with('admin:id,name,email')
            ->latest('id')
            ->paginate(25)
            ->through(fn (AdminActivityLog $log): array => [
                'id' => $log->id,
                'action' => $log->action,
                'description' => $log->description(),
                'admin_name' => $log->admin?->name,
                'created_at' => $log->created_at?->toIso8601String(),
                'meta' => $log->meta,
            ]);

        return Inertia::render('admin/activity-log/index', [
            'logs' => $logs,
        ]);
    }
}
