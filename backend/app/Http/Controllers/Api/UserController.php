<?php

namespace App\Http\Controllers\Api;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Models\Setting;
use App\Models\User;
use App\Models\UserNotification;
use App\Mail\AdminPasswordResetMail;
use App\Services\AuditService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    public function __construct(private AuditService $audit, private NotificationService $notifications) {}

    public function index(Request $request): JsonResponse
    {
        $users = User::with('staffProfile.organizationalUnit', 'staffProfile.employeeProfile')
            ->when($request->role, fn ($q) => $q->where('role', $request->role))
            ->when($request->search, fn ($q) => $q->where('email', 'like', "%{$request->search}%"))
            ->paginate(20);

        return response()->json($users);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['password'] = Hash::make($data['password']);

        $user = User::create($data);
        $this->audit->log('user.created', $user, [], $user->toArray(), $request);

        return response()->json($user, 201);
    }

    public function show(User $user): JsonResponse
    {
        return response()->json(
            $user->load('staffProfile.grade', 'staffProfile.organizationalUnit',
                        'staffProfile.professorProfile', 'staffProfile.employeeProfile')
        );
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $old = $user->toArray();
        $data = $request->validated();

        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        $user->update($data);
        $this->audit->log('user.updated', $user, $old, $user->fresh()->toArray(), $request);

        return response()->json($user->fresh());
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->audit->log('user.deleted', $user, $user->toArray(), [], $request);
        $user->delete();

        return response()->json(['message' => 'User deleted.']);
    }

    public function updateStatus(Request $request, User $user): JsonResponse
    {
        $request->validate(['is_active' => ['required', 'boolean']]);

        $old = ['is_active' => $user->is_active];
        $user->update(['is_active' => $request->is_active]);
        $this->audit->log('user.status_changed', $user, $old, ['is_active' => $user->is_active], $request);

        return response()->json($user->fresh());
    }

    /**
     * Réinitialise le mot de passe d'un agent après vérification du mot de
     * passe de l'administrateur. Les mots de passe ne sont jamais journalisés.
     */
    public function resetPasswordByAdmin(Request $request, User $user): JsonResponse
    {
        if (! in_array($user->role, [Role::Professeur, Role::Employe], true)) {
            return response()->json([
                'message' => 'Seuls les comptes employé et professeur peuvent être réinitialisés ici.',
            ], 422);
        }

        $data = $request->validate([
            'admin_password'        => ['required', 'string'],
            'password'              => ['required', 'string', 'min:' . Setting::passwordMin(), 'confirmed'],
            'password_confirmation' => ['required', 'string'],
        ]);

        $admin = $request->user();

        if (! Hash::check($data['admin_password'], $admin->password)) {
            throw ValidationException::withMessages([
                'admin_password' => ['Le mot de passe administrateur est incorrect.'],
            ]);
        }

        if (Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['Le nouveau mot de passe doit être différent de l’ancien.'],
            ]);
        }

        $newPassword = $data['password'];
        $user->forceFill(['password' => Hash::make($newPassword)])->save();

        // Notification interne sans e-mail de notification standard afin de
        // ne pas doubler l'envoi. Le mail contenant le nouveau mot de passe est
        // envoyé séparément ci-dessous.
        $this->notifications->notifyWithoutEmail(
            $user,
            'admin.announcement',
            'Mot de passe réinitialisé',
            "Votre mot de passe a été réinitialisé par l'administration.",
        );

        // Envoi d'un email obligatoire contenant le nouveau mot de passe.
        Mail::to($user->email)->send(new AdminPasswordResetMail(
            $user->staffProfile?->prenom_fr,
            $newPassword,
        ));

        $this->audit->log(
            'user.password_reset_by_admin',
            $user,
            [],
            ['password_reset' => true],
            $request,
        );

        return response()->json(['message' => 'Mot de passe réinitialisé.']);
    }

    // Profile endpoints (own profile)
    public function profile(Request $request): JsonResponse
    {
        return response()->json(
            $request->user()->load('staffProfile.grade', 'staffProfile.organizationalUnit',
                                   'staffProfile.professorProfile', 'staffProfile.employeeProfile')
        );
    }

    public function updateContact(Request $request): JsonResponse
    {
        $data = $request->validate([
            'telephone'        => ['nullable', 'string', 'max:20'],
            'current_password' => ['required_with:password', 'string'],
            'password'         => ['nullable', 'string', 'min:' . Setting::passwordMin(), 'confirmed'],
        ]);

        $user = $request->user();

        if (! empty($data['password'])) {
            // Sans cette vérification, un poste laissé ouvert suffirait
            // à s'approprier définitivement le compte.
            if (! Hash::check($data['current_password'], $user->password)) {
                throw ValidationException::withMessages([
                    'current_password' => ['Le mot de passe actuel est incorrect.'],
                ]);
            }

            $user->update(['password' => Hash::make($data['password'])]);
            $this->audit->log('profile.password_changed', $user, [], [], $request);
        }

        if ($user->staffProfile && array_key_exists('telephone', $data)) {
            $user->staffProfile->update(['telephone' => $data['telephone']]);
        }

        return response()->json($user->fresh()->load('staffProfile'));
    }

    // Own profile — create full staff profile
    public function storeProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->staffProfile) {
            return response()->json(['message' => 'Profile already exists.'], 409);
        }

        // Le type est déduit du rôle du compte, jamais de la requête.
        $staffType = self::staffTypeFor($user);

        $data = $request->validate($this->selfServiceRules($this->profileRules($user), $user));
        $data['staff_type'] = $staffType;

        $profile = $user->staffProfile()->create($data);

        // Un administrateur n'a pas de dossier RH : ni congés, ni ancienneté.
        // Aucun sous-profil ne lui est rattaché.
        if ($staffType === 'PROFESSEUR') {
            $profile->professorProfile()->create(
                $request->validate($this->selfServiceRules($this->professorRules()))
            );
        } elseif ($staffType === 'EMPLOYE') {
            $profile->employeeProfile()->create(
                $request->validate($this->selfServiceRules($this->employeeRules()))
            );
        }

        $this->audit->log('profile.created', $profile, [], $profile->toArray(), $request);

        return response()->json($this->loadProfile($profile), 201);
    }

    // Own profile — update full staff profile
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        $profile = $user->staffProfile;

        if (! $profile) {
            return response()->json(['message' => 'Profile not found.'], 404);
        }

        $old = $profile->toArray();

        // Le staff_type ne se déduit pas de la requête : il est déjà fixé par
        // l'administration et conditionne le sous-profil à mettre à jour.
        $data = $request->validate(
            $this->selfServiceRules($this->profileRules($user, $profile->id, false), $user)
        );

        $profile->update($data);

        // Un profil administrateur n'a pas de sous-profil : le créer ici
        // réintroduirait les données RH que la migration a justement retirées.
        if ($profile->staff_type === 'PROFESSEUR') {
            $subRules = $this->selfServiceRules($this->professorRules());
            $sub = $request->validate($subRules);

            $profile->professorProfile
                ? $profile->professorProfile->update($sub)
                : $profile->professorProfile()->create($sub);
        } elseif ($profile->staff_type === 'EMPLOYE') {
            $subRules = $this->selfServiceRules($this->employeeRules());
            $sub = $request->validate($subRules);

            $profile->employeeProfile
                ? $profile->employeeProfile->update($sub)
                : $profile->employeeProfile()->create($sub);
        }

        $this->audit->log('profile.updated', $profile, $old, $profile->fresh()->toArray(), $request);

        return response()->json($this->loadProfile($profile->fresh()));
    }

    // Own profile — upload photo
    public function uploadPhoto(Request $request): JsonResponse
    {
        $user = $request->user();
        $profile = $user->staffProfile;

        if (! $profile) {
            return response()->json(['message' => 'Profile not found.'], 404);
        }

        $request->validate([
            'photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        if ($profile->photo_path) {
            Storage::disk('public')->delete($profile->photo_path);
        }

        $path = $request->file('photo')->store('avatars', 'public');

        $old = ['photo_path' => $profile->photo_path];
        $profile->update(['photo_path' => $path]);
        $this->audit->log('profile.photo_updated', $profile, $old, ['photo_path' => $path], $request);

        return response()->json($this->loadProfile($profile->fresh()));
    }

    // Own profile — delete photo
    public function deletePhoto(Request $request): JsonResponse
    {
        $user = $request->user();
        $profile = $user->staffProfile;

        if (! $profile) {
            return response()->json(['message' => 'Profile not found.'], 404);
        }

        if ($profile->photo_path) {
            Storage::disk('public')->delete($profile->photo_path);
            $old = ['photo_path' => $profile->photo_path];
            $profile->update(['photo_path' => null]);
            $this->audit->log('profile.photo_deleted', $profile, $old, ['photo_path' => null], $request);
        }

        return response()->json($this->loadProfile($profile->fresh()));
    }

    /**
     * Type de profil déduit du rôle du compte. Un administrateur reçoit son
     * propre type : le classer parmi les employés lui attachait un dossier RH
     * (congés, ancienneté, grade) étranger à sa fonction.
     */
    public static function staffTypeFor(User $user): string
    {
        return match ($user->role) {
            Role::Professeur => 'PROFESSEUR',
            Role::Admin      => 'ADMIN',
            default          => 'EMPLOYE',
        };
    }

    /**
     * Champs administratifs : seule l'administration peut les fixer.
     * Un agent qui les modifierait lui-même pourrait changer son grade,
     * son matricule ou s'attribuer des jours de congé.
     */
    private const ADMIN_ONLY_FIELDS = [
        'staff_type', 'cin', 'doti', 'situation_administrative',
        'date_recrutement', 'grade_id', 'organizational_unit_id',
        'service_id', 'date_prise_fonction', 'date_habilitation',
        'date_affectation', 'anciennete', 'solde_conge', 'conge_reporte',
    ];

    /**
     * Retire les champs administratifs d'un jeu de règles pour le self-service.
     * L'administration (StaffProfileController) n'emprunte pas ce chemin.
     */
    private function selfServiceRules(array $rules, ?User $user = null): array
    {
        $interdits = self::ADMIN_ONLY_FIELDS;

        // La fonction d'un agent relève de son dossier RH (fonction_actuelle) ;
        // seul un administrateur, qui n'en a pas, renseigne la sienne.
        if (! $user || ! $user->isAdmin()) {
            $interdits[] = 'fonction';
        }

        return array_diff_key($rules, array_flip($interdits));
    }

    private function profileRules($user, ?int $ignoreId = null, bool $creating = true): array
    {
        $cinRule  = 'unique:staff_profiles,cin' . ($ignoreId ? ",{$ignoreId}" : '');
        $dotiRule = 'unique:staff_profiles,doti' . ($ignoreId ? ",{$ignoreId}" : '');

        return [
            'staff_type'             => [$creating ? 'required' : 'sometimes', 'in:PROFESSEUR,EMPLOYE'],
            'nom_fr'                 => [$creating ? 'required' : 'sometimes', 'string', 'max:100'],
            'prenom_fr'              => [$creating ? 'required' : 'sometimes', 'string', 'max:100'],
            'nom_ar'                 => ['nullable', 'string', 'max:100'],
            'prenom_ar'              => ['nullable', 'string', 'max:100'],
            'sexe'                   => ['nullable', 'in:M,F'],
            'date_naissance'         => ['nullable', 'date'],
            'lieu_naissance'         => ['nullable', 'string', 'max:100'],
            'cin'                    => ['nullable', 'string', 'max:20', $cinRule],
            'doti'                   => ['nullable', 'string', 'max:20', $dotiRule],
            'telephone'              => ['nullable', 'string', 'max:20'],
            'fonction'               => ['nullable', 'string', 'max:200'],
            'situation_administrative'=> ['nullable', 'string', 'max:100'],
            'date_recrutement'       => ['nullable', 'date'],
            'grade_id'               => ['nullable', 'exists:grades,id'],
            'organizational_unit_id' => ['nullable', 'exists:organizational_units,id'],
        ];
    }

    private function professorRules(): array
    {
        return [
            'date_prise_fonction'  => ['nullable', 'date'],
            'date_habilitation'    => ['nullable', 'date'],
            'specialite'           => ['nullable', 'string', 'max:200'],
        ];
    }

    private function employeeRules(): array
    {
        return [
            'service_id'         => ['nullable', 'exists:organizational_units,id'],
            'date_affectation'   => ['nullable', 'date'],
            'fonction_actuelle'  => ['nullable', 'string', 'max:200'],
            'situation_familiale'=> ['nullable', 'string', 'max:50'],
            'nombre_enfants'     => ['nullable', 'integer', 'min:0'],
            'anciennete'         => ['nullable', 'string', 'max:50'],
            'solde_conge'        => ['nullable', 'numeric', 'min:0'],
            'conge_reporte'      => ['nullable', 'numeric', 'min:0'],
        ];
    }

    private function loadProfile($profile)
    {
        return $profile->load('grade', 'organizationalUnit', 'professorProfile', 'employeeProfile');
    }
}
