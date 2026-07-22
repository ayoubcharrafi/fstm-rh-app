<?php

namespace App\Http\Controllers\Api;

use App\Enums\RequestStatus;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\DocumentRequest;
use App\Models\RequestFile;
use App\Models\RequestStatusHistory;
use App\Models\Setting;
use App\Models\User;
use App\Models\UserNotification;
use App\Services\XlsxWriter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

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

        // 12 derniers mois glissants avec séries total / validées / rejetées
        $start = Carbon::now()->startOfMonth()->subMonths(11);
        $rows = DocumentRequest::selectRaw('DATE_FORMAT(created_at, "%Y-%m") as month, count(*) as total')
            ->where('created_at', '>=', $start)
            ->groupBy('month')
            ->pluck('total', 'month');
        $validatedByMonth = DocumentRequest::selectRaw('DATE_FORMAT(validated_at, "%Y-%m") as month, count(*) as total')
            ->whereNotNull('validated_at')
            ->where('validated_at', '>=', $start)
            ->groupBy('month')
            ->pluck('total', 'month');
        $rejectedByMonth = DocumentRequest::selectRaw('DATE_FORMAT(rejected_at, "%Y-%m") as month, count(*) as total')
            ->whereNotNull('rejected_at')
            ->where('rejected_at', '>=', $start)
            ->groupBy('month')
            ->pluck('total', 'month');

        $monthly = [];
        for ($i = 0; $i < 12; $i++) {
            $key = $start->copy()->addMonths($i)->format('Y-m');
            $monthly[] = [
                'month'     => $key,
                'total'     => (int) ($rows[$key] ?? 0),
                'validated' => (int) ($validatedByMonth[$key] ?? 0),
                'rejected'  => (int) ($rejectedByMonth[$key] ?? 0),
            ];
        }

        $avgProcessing = DocumentRequest::whereNotNull('validated_at')
            ->whereNotNull('submitted_at')
            ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, submitted_at, validated_at)) as avg_hours')
            ->value('avg_hours');

        // KPIs
        $s = fn (RequestStatus $st) => (int) ($requestsByStatus[$st->value] ?? 0);
        $totalRequests = (int) $requestsByStatus->sum();
        $pending    = $s(RequestStatus::EnAttente);
        $inProgress = $s(RequestStatus::EnCours);
        $validated  = $s(RequestStatus::Validee);
        $available  = $s(RequestStatus::DocumentDisponible);
        $rejected   = $s(RequestStatus::Rejetee);
        $decided    = $validated + $available + $rejected;

        $now  = Carbon::now();
        $last30Start = $now->copy()->subDays(30);
        $prev30Start = $now->copy()->subDays(60);
        $requestsLast30 = DocumentRequest::where('created_at', '>=', $last30Start)->count();
        $requestsPrev30 = DocumentRequest::whereBetween('created_at', [$prev30Start, $last30Start])->count();

        $totalUsers    = (int) $usersByRole->sum();
        $activeUsers   = User::where('is_active', true)->count();
        $newUsers30    = User::where('created_at', '>=', $last30Start)->count();

        $kpis = [
            'total_requests'    => $totalRequests,
            'pending'           => $pending,
            'in_progress'       => $inProgress,
            'backlog'           => $pending + $inProgress,
            'validated'         => $validated,
            'available'         => $available,
            'rejected'          => $rejected,
            'rejection_rate'    => $decided > 0 ? round(($rejected / $decided) * 100) : 0,
            'requests_last_30d' => $requestsLast30,
            'requests_prev_30d' => $requestsPrev30,
            'total_users'       => $totalUsers,
            'active_users'      => $activeUsers,
            'inactive_users'    => max(0, $totalUsers - $activeUsers),
            'new_users_30d'     => $newUsers30,
        ];

        // Répartition par type de document (top 8)
        $requestsByType = DocumentRequest::query()
            ->join('document_types', 'requests.document_type_id', '=', 'document_types.id')
            ->whereNull('requests.deleted_at')
            ->selectRaw('document_types.nom_fr as label, count(*) as total')
            ->groupBy('document_types.nom_fr')
            ->orderByDesc('total')
            ->limit(8)
            ->get()
            ->map(fn ($r) => ['label' => $r->label, 'total' => (int) $r->total]);

        // Répartition par département (top 8)
        $requestsByDept = DocumentRequest::query()
            ->join('users', 'requests.requester_id', '=', 'users.id')
            ->join('staff_profiles', 'staff_profiles.user_id', '=', 'users.id')
            ->join('organizational_units', 'staff_profiles.organizational_unit_id', '=', 'organizational_units.id')
            ->whereNull('requests.deleted_at')
            ->selectRaw('organizational_units.nom_fr as label, count(*) as total')
            ->groupBy('organizational_units.nom_fr')
            ->orderByDesc('total')
            ->limit(8)
            ->get()
            ->map(fn ($r) => ['label' => $r->label, 'total' => (int) $r->total]);

        // Cycle de vie (durées moyennes par étape, en heures)
        $pipeline = [
            'submit_to_processing' => round((float) DocumentRequest::whereNotNull('submitted_at')->whereNotNull('processing_started_at')
                ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, submitted_at, processing_started_at)) as v')->value('v'), 1),
            'processing_to_decision' => round((float) DocumentRequest::whereNotNull('processing_started_at')
                ->where(fn ($q) => $q->whereNotNull('validated_at')->orWhereNotNull('rejected_at'))
                ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, processing_started_at, COALESCE(validated_at, rejected_at))) as v')->value('v'), 1),
            'decision_to_available' => round((float) DocumentRequest::whereNotNull('validated_at')->whereNotNull('completed_at')
                ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, validated_at, completed_at)) as v')->value('v'), 1),
        ];

        // Fichiers
        $filesByType = RequestFile::selectRaw('type, count(*) as total')->groupBy('type')->pluck('total', 'type');
        $filesStats = [
            'attachments' => (int) ($filesByType['PIECE_JOINTE'] ?? 0),
            'generated'   => (int) ($filesByType['GENERE'] ?? 0),
            'signed'      => (int) ($filesByType['SIGNE'] ?? 0),
            'total_size'  => (int) RequestFile::sum('size'),
        ];

        // Top demandeurs
        $topRequesters = DocumentRequest::query()
            ->join('users', 'requests.requester_id', '=', 'users.id')
            ->leftJoin('staff_profiles', 'staff_profiles.user_id', '=', 'users.id')
            ->whereNull('requests.deleted_at')
            ->selectRaw("COALESCE(NULLIF(TRIM(CONCAT(COALESCE(staff_profiles.prenom_fr, ''), ' ', COALESCE(staff_profiles.nom_fr, ''))), ''), users.email) as name, count(*) as total")
            ->groupBy('users.id', 'users.email', 'staff_profiles.prenom_fr', 'staff_profiles.nom_fr')
            ->orderByDesc('total')
            ->limit(5)
            ->get()
            ->map(fn ($r) => ['name' => $r->name, 'total' => (int) $r->total]);

        // Top agents traitants
        $topProcessors = DocumentRequest::query()
            ->join('users', 'requests.processed_by', '=', 'users.id')
            ->leftJoin('staff_profiles', 'staff_profiles.user_id', '=', 'users.id')
            ->whereNotNull('requests.processed_by')
            ->whereNull('requests.deleted_at')
            ->selectRaw("COALESCE(NULLIF(TRIM(CONCAT(COALESCE(staff_profiles.prenom_fr, ''), ' ', COALESCE(staff_profiles.nom_fr, ''))), ''), users.email) as name, count(*) as total")
            ->groupBy('users.id', 'users.email', 'staff_profiles.prenom_fr', 'staff_profiles.nom_fr')
            ->orderByDesc('total')
            ->limit(5)
            ->get()
            ->map(fn ($r) => ['name' => $r->name, 'total' => (int) $r->total]);

        // Activité récente
        $recentActivity = RequestStatusHistory::with(['request', 'changedBy.staffProfile'])
            ->latest()
            ->limit(12)
            ->get()
            ->map(function ($h) {
                $u = $h->changedBy;
                $by = $u?->staffProfile
                    ? trim("{$u->staffProfile->prenom_fr} {$u->staffProfile->nom_fr}")
                    : ($u?->email ?? 'Système');
                return [
                    'id'         => $h->id,
                    'reference'  => $h->request?->reference ?? '—',
                    'old_status' => $h->old_status,
                    'new_status' => $h->new_status,
                    'by'         => $by !== '' ? $by : ($u?->email ?? 'Système'),
                    'at'         => $h->created_at?->toIso8601String(),
                ];
            });

        // File des demandes à traiter (en attente / en cours), les plus anciennes d'abord
        $pendingQueue = DocumentRequest::with(['requester.staffProfile', 'documentType'])
            ->whereIn('status', [RequestStatus::EnAttente->value, RequestStatus::EnCours->value])
            ->whereNull('deleted_at')
            ->orderByRaw('COALESCE(submitted_at, created_at) asc')
            ->limit(8)
            ->get()
            ->map(function ($r) {
                $u = $r->requester;
                $name = $u?->staffProfile
                    ? trim("{$u->staffProfile->prenom_fr} {$u->staffProfile->nom_fr}")
                    : ($u?->email ?? '—');
                $since = $r->submitted_at ?? $r->created_at;
                return [
                    'id'            => $r->id,
                    'reference'     => $r->reference,
                    'requester'     => $name !== '' ? $name : ($u?->email ?? '—'),
                    'document_type' => $r->documentType?->nom_fr ?? '—',
                    'status'        => $r->status->value,
                    'since'         => $since?->toIso8601String(),
                    'age_hours'     => $since ? (int) $since->diffInHours(Carbon::now()) : 0,
                ];
            });

        // Alertes : demandes en attente/en cours bloquées depuis +N heures (configurable)
        $staleThreshold = Carbon::now()->subHours((int) Setting::get('requests.stale_threshold_hours', 48));
        $staleCount = DocumentRequest::whereIn('status', [RequestStatus::EnAttente->value, RequestStatus::EnCours->value])
            ->whereNull('deleted_at')
            ->whereRaw('COALESCE(submitted_at, created_at) <= ?', [$staleThreshold])
            ->count();

        return response()->json([
            'users_by_role'          => $usersByRole,
            'active_users'           => $activeUsers,
            'requests_by_status'     => $requestsByStatus,
            'monthly_requests'       => $monthly,
            'avg_processing_hours'   => round($avgProcessing ?? 0, 1),
            'kpis'                   => $kpis,
            'requests_by_type'       => $requestsByType,
            'requests_by_department' => $requestsByDept,
            'pipeline'               => $pipeline,
            'files_stats'            => $filesStats,
            'top_requesters'         => $topRequesters,
            'top_processors'         => $topProcessors,
            'recent_activity'        => $recentActivity,
            'pending_queue'          => $pendingQueue,
            'stale_count'            => $staleCount,
        ]);
    }

    /**
     * Applique les filtres communs (recherche, action, plage de dates) à une requête audit_logs.
     */
    private function auditQuery(Request $request)
    {
        $query = AuditLog::query();

        if ($action = $request->query('action')) {
            $query->where('action', $action);
        }

        if ($from = $request->query('from')) {
            $query->where('created_at', '>=', Carbon::parse($from)->startOfDay());
        }

        if ($to = $request->query('to')) {
            $query->where('created_at', '<=', Carbon::parse($to)->endOfDay());
        }

        if ($search = trim((string) $request->query('search'))) {
            $query->where(function ($q) use ($search) {
                $q->where('action', 'like', "%{$search}%")
                    ->orWhere('ip_address', 'like', "%{$search}%")
                    ->orWhere('auditable_type', 'like', "%{$search}%")
                    ->orWhereHas('user', fn ($u) => $u->where('email', 'like', "%{$search}%"));
            });
        }

        return $query;
    }

    public function auditLogs(Request $request): JsonResponse
    {
        $logs = $this->auditQuery($request)
            ->with('user:id,email')
            ->latest()
            ->paginate(25)
            ->withQueryString();

        $now = Carbon::now();
        $stats = [
            'total'      => AuditLog::count(),
            'today'      => AuditLog::where('created_at', '>=', $now->copy()->startOfDay())->count(),
            'last_7d'    => AuditLog::where('created_at', '>=', $now->copy()->subDays(7))->count(),
            'top_action' => AuditLog::selectRaw('action, count(*) as total')
                ->groupBy('action')->orderByDesc('total')->limit(1)->value('action'),
        ];

        // Liste des actions distinctes pour alimenter le filtre côté front
        $actions = AuditLog::select('action')->distinct()->orderBy('action')->pluck('action');

        return response()->json([
            'logs'    => $logs,
            'stats'   => $stats,
            'actions' => $actions,
        ]);
    }

    /**
     * Export du journal — CSV (UTF-8 + BOM) ou XLSX natif, selon ?format=.
     * Respecte les filtres actifs.
     */
    public function auditExport(Request $request): StreamedResponse|Response
    {
        $format = $request->query('format') === 'xlsx' ? 'xlsx' : 'csv';
        $query = $this->auditQuery($request)->with('user:id,email')->latest();
        $columns = ['ID', 'Date', 'Utilisateur', 'Action', 'Entité', 'Entité ID', 'Adresse IP', 'User-Agent'];

        $rowFor = fn ($log) => [
            $log->id,
            $log->created_at?->format('Y-m-d H:i:s'),
            $log->user?->email ?? 'système',
            $log->action,
            $log->auditable_type ? class_basename($log->auditable_type) : '',
            $log->auditable_id ?? '',
            $log->ip_address ?? '',
            $log->user_agent ?? '',
        ];

        if ($format === 'xlsx') {
            $filename = 'journal-audit-'.Carbon::now()->format('Y-m-d_His').'.xlsx';
            $writer = new XlsxWriter();
            $writer->addRow($columns);
            $query->chunk(500, function ($rows) use ($writer, $rowFor) {
                foreach ($rows as $log) {
                    $writer->addRow($rowFor($log));
                }
            });

            return response($writer->build(), 200, [
                'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            ]);
        }

        $filename = 'journal-audit-'.Carbon::now()->format('Y-m-d_His').'.csv';

        return response()->stream(function () use ($query, $columns, $rowFor) {
            $out = fopen('php://output', 'w');
            // BOM UTF-8 → accents corrects à l'ouverture dans Excel
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, $columns, ',', '"', '\\');
            $query->chunk(500, function ($rows) use ($out, $rowFor) {
                foreach ($rows as $log) {
                    fputcsv($out, $rowFor($log), ',', '"', '\\');
                }
            });
            fclose($out);
        }, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    /**
     * Purge des entrées : plus vieilles que N jours, avant une date précise,
     * ou tout vider. L'action de purge est elle-même journalisée.
     */
    public function auditPurge(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'days'   => ['nullable', 'integer', 'min:0', 'max:3650'],
            'before' => ['nullable', 'date'],
            'all'    => ['nullable', 'boolean'],
        ]);

        $all    = (bool) ($validated['all'] ?? false);
        $days   = (int) ($validated['days'] ?? 0);
        $before = $validated['before'] ?? null;

        $query = AuditLog::query();
        $scope = [];

        if ($all) {
            $scope = ['scope' => 'all'];
        } elseif ($before) {
            $cutoff = Carbon::parse($before)->startOfDay();
            $query->where('created_at', '<', $cutoff);
            $scope = ['before' => $cutoff->toDateString()];
        } elseif ($days > 0) {
            $cutoff = Carbon::now()->subDays($days);
            $query->where('created_at', '<', $cutoff);
            $scope = ['older_than_days' => $days];
        } else {
            return response()->json(['message' => 'Préciser une date, un nombre de jours, ou choisir « tout vider ».'], 422);
        }

        $deleted = $query->count();
        $query->delete();

        AuditLog::create([
            'user_id'    => Auth::id(),
            'action'     => 'audit.purged',
            'new_values' => $scope + ['deleted' => $deleted],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json(['message' => "{$deleted} entrée(s) supprimée(s).", 'deleted' => $deleted]);
    }
}
