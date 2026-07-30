<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccountDeletionRequest;
use App\Models\DocumentRequest;
use App\Models\Setting;
use App\Models\User;
use App\Services\AuditService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AccountController extends Controller
{
    public function __construct(
        private AuditService $audit,
        private NotificationService $notifications,
    ) {}

    public function changePassword(Request $request): JsonResponse
    {
        $min = Setting::passwordMin();

        $request->validate([
            'current_password' => ['required', 'string'],
            'password'         => ['required', 'string', "min:{$min}", 'confirmed'],
        ]);

        $user = $request->user();

        if (! Hash::check($request->input('current_password'), $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Le mot de passe actuel est incorrect.'],
            ]);
        }

        if (Hash::check($request->input('password'), $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['Le nouveau mot de passe doit être différent de l\'actuel.'],
            ]);
        }

        $user->update(['password' => Hash::make($request->input('password'))]);

        $this->audit->log('profile.password_changed', $user, [], [], $request);

        return response()->json(['message' => 'Mot de passe mis à jour.']);
    }

    /**
     * Changement d'adresse e-mail par l'agent lui-même.
     *
     * L'e-mail est l'identifiant de connexion : le mot de passe actuel est exigé,
     * sans quoi un poste laissé ouvert suffirait à détourner le compte.
     * Le rôle et le statut restent hors de portée de ce point d'entrée.
     */
    public function changeEmail(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'email' => [
                'required', 'email', 'max:255',
                // whereNull('deleted_at') : un compte supprimé ne doit pas
                // réserver éternellement son adresse.
                Rule::unique('users', 'email')
                    ->ignore($user->id)
                    ->whereNull('deleted_at'),
            ],
            'current_password' => ['required', 'string'],
        ]);

        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Le mot de passe actuel est incorrect.'],
            ]);
        }

        $nouvel = strtolower(trim($data['email']));

        if ($nouvel === strtolower($user->email)) {
            throw ValidationException::withMessages([
                'email' => ['Cette adresse est déjà celle de votre compte.'],
            ]);
        }

        $ancien = $user->email;
        $user->update(['email' => $nouvel]);

        // Trace explicite : l'identifiant de connexion a changé, l'administration
        // doit pouvoir relier l'ancienne et la nouvelle adresse.
        $this->audit->log(
            'account.email_changed',
            $user,
            ['email' => $ancien],
            ['email' => $nouvel],
            $request,
        );

        return response()->json([
            'message' => 'Adresse e-mail mise à jour. Elle servira désormais à vous connecter.',
            'email'   => $nouvel,
        ]);
    }

    /**
     * Résumé du compte : alimente l'onglet « Compte » et signale une éventuelle
     * demande de suppression en cours.
     */
    public function overview(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'email'            => $user->email,
            'role'             => $user->role,
            'is_active'        => $user->is_active,
            'email_notifications' => (bool) $user->email_notifications,
            'email_globally_enabled' => (bool) Setting::get('notifications.email_enabled', true),
            'last_login_at'    => $user->last_login_at,
            'created_at'       => $user->created_at,
            'password_min'     => Setting::passwordMin(),
            'requests_count'   => DocumentRequest::where('requester_id', $user->id)->count(),
            'deletion_request' => $this->pendingDeletion($user),
        ]);
    }

    /**
     * Activation ou coupure des notifications par e-mail.
     */
    public function updateEmailNotifications(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email_notifications' => ['required', 'boolean'],
        ]);

        $user = $request->user();
        $ancien = (bool) $user->email_notifications;

        $user->update(['email_notifications' => $data['email_notifications']]);

        $this->audit->log(
            'account.email_notifications_changed',
            $user,
            ['email_notifications' => $ancien],
            ['email_notifications' => $data['email_notifications']],
            $request,
        );

        return response()->json([
            'message' => $data['email_notifications']
                ? 'Vous recevrez les notifications importantes par e-mail.'
                : 'Les notifications par e-mail sont désactivées.',
            'email_notifications' => (bool) $data['email_notifications'],
        ]);
    }

    /**
     * Export des données personnelles (loi 09-08 / RGPD) : l'agent doit pouvoir
     * emporter une copie de ce que l'établissement détient sur lui.
     */
    public function exportData(Request $request): JsonResponse
    {
        $user = $request->user()->load([
            'staffProfile.grade',
            'staffProfile.organizationalUnit',
            'staffProfile.professorProfile',
            'staffProfile.employeeProfile',
        ]);

        $requests = DocumentRequest::with('documentType')
            ->where('requester_id', $user->id)
            ->get()
            ->map(fn ($r) => [
                'reference'  => $r->reference,
                'type'       => $r->documentType?->nom_fr,
                'langue'     => $r->language,
                'statut'     => $r->status?->value,
                'cree_le'    => $r->created_at?->toDateTimeString(),
                'soumis_le'  => $r->submitted_at?->toDateTimeString(),
                'traite_le'  => $r->completed_at?->toDateTimeString(),
            ]);

        $this->audit->log('account.data_exported', $user, [], [], $request);

        return response()->json([
            'genere_le' => now()->toDateTimeString(),
            'compte'    => [
                'email'              => $user->email,
                'role'               => $user->role,
                'cree_le'            => $user->created_at?->toDateTimeString(),
                'derniere_connexion' => $user->last_login_at?->toDateTimeString(),
            ],
            'profil'   => $user->staffProfile,
            'demandes' => $requests,
        ]);
    }

    /**
     * Demande de suppression : soumise à l'administration, jamais immédiate.
     * Le compte reste rattaché à un dossier RH et à des demandes archivées.
     */
    public function requestDeletion(Request $request): JsonResponse
    {
        $data = $request->validate([
            'motif'    => ['required', 'string', 'min:10', 'max:1000'],
            'password' => ['required', 'string'],
        ]);

        $user = $request->user();

        if (! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['Mot de passe incorrect.'],
            ]);
        }

        if ($this->pendingDeletion($user)) {
            return response()->json([
                'message' => 'Une demande de suppression est déjà en cours de traitement.',
            ], 409);
        }

        $deletion = AccountDeletionRequest::create([
            'user_id' => $user->id,
            'motif'   => $data['motif'],
            'status'  => AccountDeletionRequest::EN_ATTENTE,
        ]);

        $nom = $user->staffProfile
            ? "{$user->staffProfile->prenom_fr} {$user->staffProfile->nom_fr}"
            : $user->email;

        $this->notifications->broadcast(
            User::where('role', 'ADMIN')->get(),
            'account.deletion_requested',
            'Demande de suppression de compte',
            "{$nom} demande la suppression de son compte.",
            ['deletion_id' => $deletion->id, 'user_id' => $user->id],
        );

        $this->audit->log('account.deletion_requested', $deletion, [], $deletion->toArray(), $request);

        return response()->json($deletion, 201);
    }

    public function cancelDeletion(Request $request): JsonResponse
    {
        $user = $request->user();
        $deletion = $this->pendingDeletion($user);

        if (! $deletion) {
            return response()->json(['message' => 'Aucune demande en cours.'], 404);
        }

        $deletion->delete();
        $this->audit->log('account.deletion_cancelled', $user, [], [], $request);

        return response()->json(['message' => 'Demande de suppression annulée.']);
    }

    private function pendingDeletion(User $user): ?AccountDeletionRequest
    {
        return AccountDeletionRequest::where('user_id', $user->id)
            ->where('status', AccountDeletionRequest::EN_ATTENTE)
            ->latest()
            ->first();
    }
}
