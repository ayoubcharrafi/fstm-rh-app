<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\DocumentRequest;
use App\Models\Setting;
use App\Models\User;
use App\Models\UserNotification;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function __construct(private AuditService $audit) {}

    /**
     * Bornes de validation + type de chaque réglage exposé.
     *
     * @var array<string, array{min:int, max:int}>
     */
    private const RULES = [
        'requests.stale_threshold_hours' => ['min' => 1,  'max' => 720],
        'security.login_max_attempts'    => ['min' => 1,  'max' => 20],
        'security.login_decay_seconds'   => ['min' => 10, 'max' => 3600],
        'security.password_min_length'   => ['min' => 6,  'max' => 64],
        'security.jwt_ttl_minutes'       => ['min' => 15, 'max' => 43200],
        'logs.audit_retention_days'      => ['min' => 0,  'max' => 3650],
    ];

    /**
     * Réglages booléens, validés séparément des bornes numériques.
     *
     * @var array<string, bool>  clé => valeur par défaut
     */
    private const BOOLEENS = [
        'notifications.email_enabled'                    => true,

        // Étapes intermédiaires : désactivées par défaut. L'agent vient d'agir ou
        // l'information est mineure, et un e-mail à chaque étape ferait classer
        // toute la série en indésirable. L'administration peut les activer.
        'notifications.email.request_submitted'          => false,
        'notifications.email.request_processing'         => false,

        // Événements que l'agent attend ou sur lesquels il doit agir.
        'notifications.email.request_validated'          => true,
        'notifications.email.request_rejected'           => true,
        'notifications.email.document_available'         => true,
        'notifications.email.admin_announcement'         => true,

        // Destinée aux administrateurs, qui traitent la demande.
        'notifications.email.account_deletion_requested' => false,
        'notifications.email.account_deletion_rejected'  => true,
    ];

    public function index(): JsonResponse
    {
        return response()->json([
            'settings' => $this->currentSettings(),
            'system'   => [
                'php_version'          => PHP_VERSION,
                'laravel_version'      => app()->version(),
                'users'                => User::count(),
                'requests'             => DocumentRequest::whereNull('deleted_at')->count(),
                'audit_logs'           => AuditLog::count(),
                'notifications_read'   => UserNotification::whereNotNull('read_at')->count(),
                'notifications_unread' => UserNotification::whereNull('read_at')->count(),
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $rules = [];
        foreach (self::RULES as $key => $bounds) {
            $field = str_replace('.', '_', $key);
            $rules[$field] = ['nullable', 'integer', "min:{$bounds['min']}", "max:{$bounds['max']}"];
        }
        foreach (array_keys(self::BOOLEENS) as $key) {
            $rules[str_replace('.', '_', $key)] = ['nullable', 'boolean'];
        }

        $validated = $request->validate($rules);

        $old = $this->currentSettings();
        $changed = [];

        foreach (self::RULES as $key => $bounds) {
            $field = str_replace('.', '_', $key);
            if ($request->has($field) && $validated[$field] !== null) {
                Setting::set($key, (int) $validated[$field], 'int');
                $changed[$key] = (int) $validated[$field];
            }
        }

        foreach (array_keys(self::BOOLEENS) as $key) {
            $field = str_replace('.', '_', $key);
            if ($request->has($field) && $validated[$field] !== null) {
                $valeur = (bool) $validated[$field];
                Setting::set($key, $valeur, 'bool');
                $changed[$key] = $valeur;
            }
        }

        if ($changed) {
            $this->audit->log('settings.updated', null, $old, $changed, $request);
        }

        return response()->json([
            'message'  => 'Paramètres enregistrés.',
            'settings' => $this->currentSettings(),
        ]);
    }

    public function purgeReadNotifications(Request $request): JsonResponse
    {
        $count = UserNotification::whereNotNull('read_at')->count();
        UserNotification::whereNotNull('read_at')->delete();

        $this->audit->log('notifications.purged', null, [], ['deleted' => $count], $request);

        return response()->json([
            'message' => "{$count} notification(s) lue(s) supprimée(s).",
            'deleted' => $count,
        ]);
    }

    /**
     * Lit les réglages courants (valeur en base, sinon défaut codé en dur).
     *
     * @return array<string, int|bool>
     */
    private function currentSettings(): array
    {
        $defaults = [
            'requests.stale_threshold_hours' => 48,
            'security.login_max_attempts'    => 5,
            'security.login_decay_seconds'   => 60,
            'security.password_min_length'   => 8,
            'security.jwt_ttl_minutes'       => 60,
            'logs.audit_retention_days'      => 0,
        ];

        $out = [];
        foreach ($defaults as $key => $default) {
            $out[$key] = (int) Setting::get($key, $default);
        }

        foreach (self::BOOLEENS as $key => $default) {
            $out[$key] = (bool) Setting::get($key, $default);
        }

        return $out;
    }
}
