<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    public function index(): JsonResponse
    {
        $notifications = UserNotification::where('user_id', Auth::id())
            ->latest()
            ->paginate(20);

        return response()->json($notifications);
    }

    public function markRead(UserNotification $notification): JsonResponse
    {
        if ($notification->user_id !== Auth::id()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $notification->update(['read_at' => now()]);
        return response()->json($notification->fresh());
    }

    public function markAllRead(): JsonResponse
    {
        UserNotification::where('user_id', Auth::id())
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'All notifications marked as read.']);
    }
}
