<?php

namespace Database\Seeders;

use App\Models\DocumentType;
use Illuminate\Database\Seeder;

class DocumentTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            // Communs (Professeurs et Employés)
            ['code' => 'ATT-TRAV',  'nom_fr' => 'Attestation de travail',                        'nom_ar' => 'شهادة العمل',                    'allowed_role' => 'TOUS',       'requires_language' => true],
            ['code' => 'ATT-SAL',   'nom_fr' => 'Attestation de salaire',                        'nom_ar' => 'شهادة الأجر',                    'allowed_role' => 'TOUS',       'requires_language' => false],
            ['code' => 'ODM',       'nom_fr' => 'Ordre de mission',                              'nom_ar' => 'أمر بمهمة',                       'allowed_role' => 'TOUS',       'requires_language' => false],
            ['code' => 'AQT',       'nom_fr' => 'Autorisation de quitter le territoire administratif', 'nom_ar' => 'إذن بمغادرة التراب الوطني', 'allowed_role' => 'TOUS',  'requires_language' => false],

            // Spécifiques aux Professeurs
            ['code' => 'ATT-HAB',   'nom_fr' => 'Attestation pour habilitation',                 'nom_ar' => 'شهادة التأهيل',                  'allowed_role' => 'PROFESSEUR', 'requires_language' => false],

            // Spécifiques aux Employés
            ['code' => 'CARTE-NOT', 'nom_fr' => 'Carte de notation',                             'nom_ar' => 'بطاقة التنقيط',                  'allowed_role' => 'EMPLOYE',    'requires_language' => false],
            ['code' => 'PV-REPRISE','nom_fr' => 'Procès-verbal de reprise de travail',           'nom_ar' => 'محضر استئناف العمل',              'allowed_role' => 'EMPLOYE',    'requires_language' => false],
            ['code' => 'CONGE-ADM', 'nom_fr' => 'Demande de congé administratif annuel',         'nom_ar' => 'الرخصة الإدارية السنوية',         'allowed_role' => 'EMPLOYE',    'requires_language' => false],
        ];

        foreach ($types as $type) {
            DocumentType::updateOrCreate(['code' => $type['code']], $type);
        }
    }
}
