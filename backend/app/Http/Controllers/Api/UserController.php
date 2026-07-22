<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Models\Setting;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class UserController extends Controller
{
    public function __construct(private AuditService $audit) {}

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
            'telephone' => ['nullable', 'string', 'max:20'],
            'password'  => ['nullable', 'string', 'min:' . Setting::passwordMin(), 'confirmed'],
        ]);

        $user = $request->user();

        if (isset($data['password'])) {
            $user->update(['password' => Hash::make($data['password'])]);
        }

        if ($user->staffProfile && isset($data['telephone'])) {
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

        $data = $request->validate($this->profileRules($user));

        $profile = $user->staffProfile()->create($data);

        if ($data['staff_type'] === 'PROFESSEUR') {
            $profile->professorProfile()->create($request->validate($this->professorRules()));
        } else {
            $profile->employeeProfile()->create($request->validate($this->employeeRules()));
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
        $data = $request->validate($this->profileRules($user, $profile->id, false));

        $profile->update($data);

        if ($profile->staff_type === 'PROFESSEUR') {
            $profile->professorProfile
                ? $profile->professorProfile->update($request->only(array_keys($this->professorRules())))
                : $profile->professorProfile()->create($request->validate($this->professorRules()));
        } else {
            $profile->employeeProfile
                ? $profile->employeeProfile->update($request->only(array_keys($this->employeeRules())))
                : $profile->employeeProfile()->create($request->validate($this->employeeRules()));
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
            'situation_administrative'=> ['nullable', 'string', 'max:100'],
            'date_recrutement'       => ['nullable', 'date'],
            'grade_id'               => ['nullable', 'exists:grades,id'],
            'organizational_unit_id' => ['nullable', 'exists:organizational_units,id'],
        ];
    }

    private function professorRules(): array
    {
        return [
            'laboratoire_id'       => ['nullable', 'exists:organizational_units,id'],
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
