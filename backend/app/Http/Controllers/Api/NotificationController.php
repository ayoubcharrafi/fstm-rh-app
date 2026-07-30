<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserNotification;
use App\Services\AuditService;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    public function __construct(
        private NotificationService $notif,
        private AuditService $audit,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $mine = fn () => UserNotification::where('user_id', Auth::id());

        $notifications = $mine()
            ->when($request->status === 'unread', fn ($q) => $q->whereNull('read_at'))
            ->when($request->status === 'read', fn ($q) => $q->whereNotNull('read_at'))
            ->when($request->type, fn ($q) => $q->where('type', $request->type))
            ->latest()
            ->paginate(20)
            ->withQueryString();

        // Compteurs globaux : la pastille « non lues » doit refléter le total,
        // pas seulement la page courante.
        return response()->json(array_merge($notifications->toArray(), [
            'unread_count' => $mine()->whereNull('read_at')->count(),
            'total_count'  => $mine()->count(),
        ]));
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

    public function purge(Request $request): JsonResponse
    {
        $data = $request->validate([
            'mode' => ['required', 'in:read,7_days,30_days,90_days,before_date'],
            'before_date' => ['required_if:mode,before_date', 'date', 'before:today'],
        ]);

        $query = UserNotification::where('user_id', Auth::id());

        switch ($data['mode']) {
            case 'read':
                $query->whereNotNull('read_at');
                break;
            case '7_days':
                $query->where('created_at', '<', Carbon::now()->subDays(7));
                break;
            case '30_days':
                $query->where('created_at', '<', Carbon::now()->subDays(30));
                break;
            case '90_days':
                $query->where('created_at', '<', Carbon::now()->subDays(90));
                break;
            case 'before_date':
                $query->where('created_at', '<', Carbon::parse($data['before_date'])->endOfDay());
                break;
        }

        $deleted = $query->delete();

        $this->audit->log('notifications.purged', Auth::user(), [], ['mode' => $data['mode'], 'before_date' => $data['before_date'] ?? null, 'count' => $deleted], $request);

        return response()->json([
            'message' => $deleted > 0 ? "{$deleted} notification(s) supprimée(s)." : 'Aucune notification à supprimer.',
            'deleted' => $deleted,
        ]);
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
