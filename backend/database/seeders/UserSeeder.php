<?php

namespace Database\Seeders;

use App\Models\Grade;
use App\Models\OrganizationalUnit;
use App\Models\StaffProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Admin
        $admin = User::firstOrCreate(
            ['email' => 'admin@fst.ma'],
            [
                'password'  => Hash::make('Admin@1234'),
                'role'      => 'ADMIN',
                'is_active' => true,
            ]
        );

        // Demo professor
        $prof = User::firstOrCreate(
            ['email' => 'professeur@fst.ma'],
            [
                'password'  => Hash::make('Prof@1234'),
                'role'      => 'PROFESSEUR',
                'is_active' => true,
            ]
        );

        $gradeProf = Grade::where('code', 'PES-C')->first();
        $dept      = OrganizationalUnit::where('code', 'INF')->first();

        if ($prof && ! $prof->staffProfile) {
            $sp = StaffProfile::create([
                'user_id'   => $prof->id,
                'staff_type'=> 'PROFESSEUR',
                'nom_fr'    => 'Bensalem',
                'prenom_fr' => 'Ahmed',
                'nom_ar'    => 'بنسالم',
                'prenom_ar' => 'أحمد',
                'doti'      => 'DOTI-0001',
                'grade_id'  => $gradeProf?->id,
                'organizational_unit_id' => $dept?->id,
            ]);
            $sp->professorProfile()->create(['specialite' => 'Génie logiciel']);
        }

        // Demo employee
        $emp = User::firstOrCreate(
            ['email' => 'employe@fst.ma'],
            [
                'password'  => Hash::make('Emp@1234'),
                'role'      => 'EMPLOYE',
                'is_active' => true,
            ]
        );

        $gradeEmp = Grade::where('code', 'ADM-1')->first();

        if ($emp && ! $emp->staffProfile) {
            $sp = StaffProfile::create([
                'user_id'   => $emp->id,
                'staff_type'=> 'EMPLOYE',
                'nom_fr'    => 'Alaoui',
                'prenom_fr' => 'Fatima',
                'nom_ar'    => 'العلوي',
                'prenom_ar' => 'فاطمة',
                'doti'      => 'DOTI-0002',
                'grade_id'  => $gradeEmp?->id,
                'organizational_unit_id' => $dept?->id,
            ]);
            $sp->employeeProfile()->create(['fonction_actuelle' => 'Secrétaire de direction', 'solde_conge' => 20]);
        }
    }
}
