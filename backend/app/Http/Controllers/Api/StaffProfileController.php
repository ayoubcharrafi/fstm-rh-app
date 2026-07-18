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
    public function __construct(private AuditService $audit) {}

    public function store(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'staff_type'             => ['required', 'in:PROFESSEUR,EMPLOYE'],
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
            'situation_administrative'=> ['nullable', 'string', 'max:100'],
            'date_recrutement'       => ['nullable', 'date'],
            'grade_id'               => ['nullable', 'exists:grades,id'],
            'organizational_unit_id' => ['nullable', 'exists:organizational_units,id'],
        ]);

        $profile = $user->staffProfile()->create($data);

        // Create sub-profile
        if ($data['staff_type'] === 'PROFESSEUR') {
            $profile->professorProfile()->create($request->validate([
                'laboratoire_id'       => ['nullable', 'exists:organizational_units,id'],
                'date_prise_fonction'  => ['nullable', 'date'],
                'date_habilitation'    => ['nullable', 'date'],
                'specialite'           => ['nullable', 'string', 'max:200'],
            ]));
        } else {
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
            'situation_administrative'=> ['nullable', 'string', 'max:100'],
            'date_recrutement'       => ['nullable', 'date'],
            'grade_id'               => ['nullable', 'exists:grades,id'],
            'organizational_unit_id' => ['nullable', 'exists:organizational_units,id'],
        ]);

        $profile->update($data);

        // Update sub-profile
        if ($profile->staff_type === 'PROFESSEUR' && $profile->professorProfile) {
            $profile->professorProfile->update($request->only(
                'laboratoire_id', 'date_prise_fonction', 'date_habilitation', 'specialite'
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
