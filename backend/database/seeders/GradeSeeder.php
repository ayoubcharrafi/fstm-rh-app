<?php

namespace Database\Seeders;

use App\Models\Grade;
use Illuminate\Database\Seeder;

class GradeSeeder extends Seeder
{
    public function run(): void
    {
        $grades = [
            // Professeur grades
            ['code' => 'PES-C', 'intitule_fr' => 'Professeur de l\'enseignement supérieur, grade C', 'intitule_ar' => 'أستاذ التعليم العالي، درجة ج', 'staff_type' => 'PROFESSEUR'],
            ['code' => 'PES-D', 'intitule_fr' => 'Professeur de l\'enseignement supérieur, grade D', 'intitule_ar' => 'أستاذ التعليم العالي، درجة د', 'staff_type' => 'PROFESSEUR'],
            ['code' => 'MC-A',  'intitule_fr' => 'Maître de conférences, grade A', 'intitule_ar' => 'أستاذ محاضر، درجة أ', 'staff_type' => 'PROFESSEUR'],
            ['code' => 'MC-B',  'intitule_fr' => 'Maître de conférences, grade B', 'intitule_ar' => 'أستاذ محاضر، درجة ب', 'staff_type' => 'PROFESSEUR'],
            // Employé grades (exemples)
            ['code' => 'ADM-1', 'intitule_fr' => 'Technicien administratif', 'intitule_ar' => 'تقني إداري', 'staff_type' => 'EMPLOYE'],
            ['code' => 'ADM-2', 'intitule_fr' => 'Administrateur principal',  'intitule_ar' => 'مسؤول إداري', 'staff_type' => 'EMPLOYE'],
        ];

        foreach ($grades as $grade) {
            Grade::firstOrCreate(['code' => $grade['code']], $grade);
        }
    }
}
