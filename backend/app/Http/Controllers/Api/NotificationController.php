<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserNotification;
use App\Services\AuditService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    public function __construct(
        private NotificationService $notif,
        private AuditService $audit,
    ) {}

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

    // ---------- Admin ----------

    /**
     * Statistiques globales des notifications + audience de diffusion.
     */
    public function adminStats(): JsonResponse
    {
        $total  = UserNotification::count();
        $unread = UserNotification::whereNull('read_at')->count();
        $read   = $total - $unread;

        $byType = UserNotification::selectRaw('type, count(*) as total')
            ->groupBy('type')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row) => ['type' => $row->type, 'total' => (int) $row->total]);

        return response()->json([
            'total'     => $total,
            'unread'    => $unread,
            'read'      => $read,
            'read_rate' => $total > 0 ? (int) round($read / $total * 100) : 0,
            'by_type'   => $byType,
            'audience'  => [
                'all'        => User::where('is_active', true)->count(),
                'ADMIN'      => User::where('is_active', true)->where('role', 'ADMIN')->count(),
                'PROFESSEUR' => User::where('is_active', true)->where('role', 'PROFESSEUR')->count(),
                'EMPLOYE'    => User::where('is_active', true)->where('role', 'EMPLOYE')->count(),
            ],
        ]);
    }

    /**
     * Diffuse une annonce à tous les utilisateurs, à un rôle, ou à un utilisateur précis.
     */
    public function broadcast(Request $request): JsonResponse
    {
        $data = $request->validate([
            'audience' => ['required', 'in:all,role,user'],
            'role'     => ['required_if:audience,role', 'in:ADMIN,PROFESSEUR,EMPLOYE'],
            'user_id'  => ['required_if:audience,user', 'exists:users,id'],
            'title'    => ['required', 'string', 'max:120'],
            'message'  => ['required', 'string', 'max:1000'],
        ]);

        $query = User::where('is_active', true);

        if ($data['audience'] === 'role') {
            $query->where('role', $data['role']);
        } elseif ($data['audience'] === 'user') {
            $query->where('id', $data['user_id']);
        }

        $recipients = $this->notif->broadcast(
            $query->get(),
            'admin.announcement',
            $data['title'],
            $data['message'],
        );

        $this->audit->log('notifications.broadcast', null, [], [
            'audience'   => $data['audience'],
            'role'       => $data['role'] ?? null,
            'user_id'    => $data['user_id'] ?? null,
            'title'      => $data['title'],
            'recipients' => $recipients,
        ], $request);

        return response()->json([
            'message'    => $recipients > 0
                ? "Annonce envoyée à {$recipients} destinataire(s)."
                : 'Aucun destinataire actif pour cette cible.',
            'recipients' => $recipients,
        ]);
    }
}
