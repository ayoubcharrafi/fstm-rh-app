<?php

namespace Database\Seeders;

use App\Models\OrganizationalUnit;
use Illuminate\Database\Seeder;

class OrganizationalUnitSeeder extends Seeder
{
    public function run(): void
    {
        $departments = [
            ['code' => 'INF', 'nom_fr' => 'Informatique',         'nom_ar' => 'الإعلاميات'],
            ['code' => 'MAT', 'nom_fr' => 'Mathématiques',        'nom_ar' => 'الرياضيات'],
            ['code' => 'BIO', 'nom_fr' => 'Biologie',             'nom_ar' => 'علم الأحياء'],
            ['code' => 'CHI', 'nom_fr' => 'Chimie',               'nom_ar' => 'الكيمياء'],
            ['code' => 'PHY', 'nom_fr' => 'Physique',             'nom_ar' => 'الفيزياء'],
            ['code' => 'GEL', 'nom_fr' => 'Génie Électrique',     'nom_ar' => 'الهندسة الكهربائية'],
            ['code' => 'GPE', 'nom_fr' => 'Génie des Procédés',   'nom_ar' => 'هندسة العمليات'],
        ];

        foreach ($departments as $dept) {
            OrganizationalUnit::firstOrCreate(
                ['code' => $dept['code']],
                array_merge($dept, ['type' => 'DEPARTEMENT'])
            );
        }
    }
}
