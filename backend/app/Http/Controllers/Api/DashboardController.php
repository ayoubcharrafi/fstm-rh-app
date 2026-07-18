<?php

namespace App\Http\Controllers\Api;

use App\Enums\RequestStatus;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\DocumentRequest;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function user(): JsonResponse
    {
        $user = Auth::user();

        $statusCounts = DocumentRequest::where('requester_id', $user->id)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $available = DocumentRequest::where('requester_id', $user->id)
            ->where('status', RequestStatus::DocumentDisponible->value)
            ->count();

        $unreadNotifications = UserNotification::where('user_id', $user->id)
            ->whereNull('read_at')
            ->count();

        return response()->json([
            'total_requests'       => $statusCounts->sum(),
            'by_status'            => $statusCounts,
            'documents_available'  => $available,
            'unread_notifications' => $unreadNotifications,
        ]);
    }

    public function admin(): JsonResponse
    {
        $usersByRole = User::selectRaw('role, count(*) as total')
            ->whereNull('deleted_at')
            ->groupBy('role')
            ->pluck('total', 'role');

        $requestsByStatus = DocumentRequest::selectRaw('status, count(*) as total')
            ->whereNull('deleted_at')
            ->groupBy('status')
            ->pluck('total', 'status');

        $monthly = DocumentRequest::selectRaw('DATE_FORMAT(created_at, "%Y-%m") as month, count(*) as total')
            ->whereYear('created_at', date('Y'))
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        $avgProcessing = DocumentRequest::whereNotNull('validated_at')
            ->whereNotNull('submitted_at')
            ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, submitted_at, validated_at)) as avg_hours')
            ->value('avg_hours');

        return response()->json([
            'users_by_role'       => $usersByRole,
            'active_users'        => User::where('is_active', true)->count(),
            'requests_by_status'  => $requestsByStatus,
            'monthly_requests'    => $monthly,
            'avg_processing_hours'=> round($avgProcessing ?? 0, 1),
        ]);
    }

    public function auditLogs(): JsonResponse
    {
        $logs = AuditLog::with('user')
            ->latest()
            ->paginate(50);

        return response()->json($logs);
    }
}
