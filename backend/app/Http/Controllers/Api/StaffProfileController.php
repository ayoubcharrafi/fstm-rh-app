<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmployeeProfile;
use App\Models\ProfessorProfile;
use App\Models\StaffProfile;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StaffProfileController extends Controller
{
    /**
     * Champs du dossier RH, sans objet pour un compte administrateur.
     * Mêmes colonnes que celles vidées par la migration 2026_07_29_000001.
     */
    private const CHAMPS_RH = [
        'cin', 'doti', 'grade_id', 'organizational_unit_id',
        'situation_administrative', 'date_recrutement',
    ];

    public function __construct(private AuditService $audit) {}

    public function store(Request $request, User $user): JsonResponse
    {
        if ($user->staffProfile) {
            return response()->json(['message' => 'Ce compte possède déjà un profil.'], 409);
        }

        $data = $request->validate([
            'staff_type'             => ['required', 'in:PROFESSEUR,EMPLOYE,ADMIN'],
            'nom_fr'                 => ['required', 'string', 'max:100'],
            'prenom_fr'              => ['required', 'string', 'max:100'],
            'nom_ar'                 => ['nullable', 'string', 'max:100'],
            'prenom_ar'              => ['nullable', 'string', 'max:100'],
            'sexe'                   => ['nullable', 'in:M,F'],
            'date_naissance'         => ['nullable', 'date'],
            'lieu_naissance'         => ['nullable', 'string', 'max:100'],
            'cin'                    => ['nullable', 'string', 'max:20', 'unique:staff_profiles'],
            'doti'                   => ['nullable', 'string', 'max:20', 'unique:staff_profiles'],
            'telephone'              => ['nullable', 'string', 'max:20'],
            'fonction'               => ['nullable', 'string', 'max:200'],
            'situation_administrative'=> ['nullable', 'string', 'max:100'],
            'date_recrutement'       => ['nullable', 'date'],
            'grade_id'               => ['nullable', 'exists:grades,id'],
            'organizational_unit_id' => ['nullable', 'exists:organizational_units,id'],
        ]);

        // Le type suit le rôle du compte : un administrateur enregistré comme
        // employé héritait d'un dossier RH (congés, grade, ancienneté) qui ne
        // le concerne pas, et son profil différait d'un admin à l'autre.
        $data['staff_type'] = UserController::staffTypeFor($user);

        if ($data['staff_type'] === 'ADMIN') {
            $data = array_diff_key($data, array_flip(self::CHAMPS_RH));
        }

        $profile = $user->staffProfile()->create($data);

        // Create sub-profile — un administrateur n'en a aucun.
        if ($data['staff_type'] === 'PROFESSEUR') {
            $profile->professorProfile()->create($request->validate([
                'date_prise_fonction'  => ['nullable', 'date'],
                'date_habilitation'    => ['nullable', 'date'],
                'specialite'           => ['nullable', 'string', 'max:200'],
            ]));
        } elseif ($data['staff_type'] === 'EMPLOYE') {
            $profile->employeeProfile()->create($request->validate([
                'service_id'         => ['nullable', 'exists:organizational_units,id'],
                'date_affectation'   => ['nullable', 'date'],
                'fonction_actuelle'  => ['nullable', 'string', 'max:200'],
                'situation_familiale'=> ['nullable', 'string', 'max:50'],
                'nombre_enfants'     => ['nullable', 'integer', 'min:0'],
                'anciennete'         => ['nullable', 'string', 'max:50'],
                'solde_conge'        => ['nullable', 'numeric', 'min:0'],
                'conge_reporte'      => ['nullable', 'numeric', 'min:0'],
            ]));
        }

        $this->audit->log('profile.created', $profile, [], $profile->toArray(), $request);

        return response()->json(
            $profile->load('grade', 'organizationalUnit', 'professorProfile', 'employeeProfile'),
            201
        );
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $profile = $user->staffProfile;

        if (! $profile) {
            return response()->json(['message' => 'Profile not found.'], 404);
        }

        $old = $profile->toArray();

        $data = $request->validate([
            'nom_fr'                 => ['sometimes', 'string', 'max:100'],
            'prenom_fr'              => ['sometimes', 'string', 'max:100'],
            'nom_ar'                 => ['nullable', 'string', 'max:100'],
            'prenom_ar'              => ['nullable', 'string', 'max:100'],
            'sexe'                   => ['nullable', 'in:M,F'],
            'date_naissance'         => ['nullable', 'date'],
            'lieu_naissance'         => ['nullable', 'string', 'max:100'],
            'cin'                    => ['nullable', 'string', 'max:20', 'unique:staff_profiles,cin,' . $profile->id],
            'doti'                   => ['nullable', 'string', 'max:20', 'unique:staff_profiles,doti,' . $profile->id],
            'telephone'              => ['nullable', 'string', 'max:20'],
            'fonction'               => ['nullable', 'string', 'max:200'],
            'situation_administrative'=> ['nullable', 'string', 'max:100'],
            'date_recrutement'       => ['nullable', 'date'],
            'grade_id'               => ['nullable', 'exists:grades,id'],
            'organizational_unit_id' => ['nullable', 'exists:organizational_units,id'],
        ]);

        // Le dossier RH ne s'applique pas à un administrateur : ces champs sont
        // écartés plutôt que réintroduits un à un après le nettoyage.
        if ($profile->staff_type === 'ADMIN') {
            $data = array_diff_key($data, array_flip(self::CHAMPS_RH));
        }

        $profile->update($data);

        // Update sub-profile
        if ($profile->staff_type === 'PROFESSEUR' && $profile->professorProfile) {
            $profile->professorProfile->update($request->only(
                'date_prise_fonction', 'date_habilitation', 'specialite'
            ));
        } elseif ($profile->staff_type === 'EMPLOYE' && $profile->employeeProfile) {
            $profile->employeeProfile->update($request->only(
                'service_id', 'date_affectation', 'fonction_actuelle', 'situation_familiale',
                'nombre_enfants', 'anciennete', 'solde_conge', 'conge_reporte'
            ));
        }

        $this->audit->log('profile.updated', $profile, $old, $profile->fresh()->toArray(), $request);

        return response()->json(
            $profile->fresh()->load('grade', 'organizationalUnit', 'professorProfile', 'employeeProfile')
        );
    }
}
