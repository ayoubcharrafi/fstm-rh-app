<?php

namespace Database\Seeders;

use App\Models\DocumentTemplate;
use App\Models\DocumentType;
use Illuminate\Database\Seeder;

class DocumentTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $attTrav = DocumentType::where('code', 'ATT-TRAV')->first();

        if (! $attTrav) {
            $this->command->warn('DocumentType ATT-TRAV not found. Run DocumentTypeSeeder first.');
            return;
        }

        $this->seedType($attTrav, [
            ['language' => 'fr', 'role_target' => 'EMPLOYE',    'label' => 'ATT Employé FR',    'content' => $this->employeFr()],
            ['language' => 'ar', 'role_target' => 'EMPLOYE',    'label' => 'ATT Employé AR',    'content' => $this->employeAr()],
            ['language' => 'fr', 'role_target' => 'PROFESSEUR', 'label' => 'ATT Professeur FR', 'content' => $this->professeurFr()],
            ['language' => 'ar', 'role_target' => 'PROFESSEUR', 'label' => 'ATT Professeur AR', 'content' => $this->professeurAr()],
        ]);

        // Autorisation de quitter le territoire (AQT) — French only, two layouts.
        $aqt = DocumentType::where('code', 'AQT')->first();

        if (! $aqt) {
            $this->command->warn('DocumentType AQT not found. Run DocumentTypeSeeder first.');
            return;
        }

        $this->seedType($aqt, [
            ['language' => 'fr', 'role_target' => 'EMPLOYE',    'label' => 'AQT Employé FR',    'content' => $this->aqtEmployeFr()],
            ['language' => 'fr', 'role_target' => 'PROFESSEUR', 'label' => 'AQT Professeur FR', 'content' => $this->aqtProfesseurFr()],
        ]);

        // Ordre de mission (ODM) — French only, identical layout for both roles.
        $odm = DocumentType::where('code', 'ODM')->first();

        if (! $odm) {
            $this->command->warn('DocumentType ODM not found. Run DocumentTypeSeeder first.');
            return;
        }

        $this->seedType($odm, [
            ['language' => 'fr', 'role_target' => 'EMPLOYE',    'label' => 'ODM Employé FR',    'content' => $this->odmFr()],
            ['language' => 'fr', 'role_target' => 'PROFESSEUR', 'label' => 'ODM Professeur FR', 'content' => $this->odmFr()],
        ]);

        // Attestation pour habilitation (ATT-HAB) — professeurs uniquement, FR.
        $attHab = DocumentType::where('code', 'ATT-HAB')->first();

        if (! $attHab) {
            $this->command->warn('DocumentType ATT-HAB not found. Run DocumentTypeSeeder first.');
            return;
        }

        $this->seedType($attHab, [
            ['language' => 'fr', 'role_target' => 'PROFESSEUR', 'label' => 'ATT-HAB Professeur FR', 'content' => $this->attHabFr()],
        ]);

        // Procès-verbal de reprise de travail (PV-REPRISE) — employés uniquement, AR (RTL).
        $pvReprise = DocumentType::where('code', 'PV-REPRISE')->first();

        if (! $pvReprise) {
            $this->command->warn('DocumentType PV-REPRISE not found. Run DocumentTypeSeeder first.');
            return;
        }

        $this->seedType($pvReprise, [
            ['language' => 'ar', 'role_target' => 'EMPLOYE', 'label' => 'PV-REPRISE Employé AR', 'content' => $this->pvRepriseAr()],
        ]);

        // Carte de notation (CARTE-NOT) — employés uniquement, AR (RTL), formulaire vierge à remplir à la main.
        $carteNot = DocumentType::where('code', 'CARTE-NOT')->first();

        if (! $carteNot) {
            $this->command->warn('DocumentType CARTE-NOT not found. Run DocumentTypeSeeder first.');
            return;
        }

        $this->seedType($carteNot, [
            ['language' => 'ar', 'role_target' => 'EMPLOYE', 'label' => 'CARTE-NOT Employé AR', 'content' => $this->carteNotAr()],
        ]);

        // Licence administrative annuelle (CONGE-ADM) — employés uniquement, AR (RTL).
        $congeAdm = DocumentType::where('code', 'CONGE-ADM')->first();

        if (! $congeAdm) {
            $this->command->warn('DocumentType CONGE-ADM not found. Run DocumentTypeSeeder first.');
            return;
        }

        $this->seedType($congeAdm, [
            ['language' => 'ar', 'role_target' => 'EMPLOYE', 'label' => 'CONGE-ADM Employé AR', 'content' => $this->congeAdmAr()],
        ]);
    }

    /**
     * Deactivate a document type's existing templates and create the new ones
     * as fresh versions.
     *
     * @param  array<int,array{language:string,role_target:string,label:string,content:string}>  $templates
     */
    private function seedType(DocumentType $type, array $templates): void
    {
        DocumentTemplate::where('document_type_id', $type->id)->update(['is_active' => false]);

        foreach ($templates as $tpl) {
            $lastVersion = DocumentTemplate::where('document_type_id', $type->id)
                ->where('language', $tpl['language'])
                ->where('role_target', $tpl['role_target'])
                ->max('version') ?? 0;

            DocumentTemplate::create([
                'document_type_id' => $type->id,
                'language'         => $tpl['language'],
                'role_target'      => $tpl['role_target'],
                'version'          => $lastVersion + 1,
                'content'          => $tpl['content'],
                'is_active'        => true,
            ]);

            $this->command->info("Created: {$tpl['label']}");
        }
    }

    private function employeFr(): string { return <<<'HTML'
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<style>
@page { margin:0; size:A4 portrait; }
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:"DejaVu Sans",Arial,sans-serif;font-size:11.5pt;color:#000;padding:1.5cm 2.5cm 2cm 2.5cm;}
.hi{width:112%;display:block;margin-left:-6%;} .hb{margin-bottom:60px;}
.title{text-align:center;font-size:16pt;font-weight:900;letter-spacing:3px;text-decoration:underline;margin-bottom:38px;}
.intro{font-size:11.5pt;font-weight:bold;text-align:left;margin-bottom:14px;line-height:1.6;}
table.f{width:100%;border-collapse:collapse;}
table.f td{font-weight:bold;font-size:11.5pt;padding:4px 0;vertical-align:top;line-height:1.8;}
td.l{width:80px;font-weight:900;white-space:nowrap;}
td.c{width:25px;font-weight:900;}
td.v{font-weight:bold;}
.ex{font-size:11.5pt;font-weight:bold;text-indent:40px;margin-top:22px;margin-bottom:12px;}
.cl{font-size:11.5pt;font-weight:bold;text-align:justify;line-height:1.7;}
.fd{text-align:right;margin-top:70px;font-size:11pt;font-weight:bold;}
</style></head><body>
<div class="hb"><img class="hi" src="{{ asset.entete }}" /></div>
<div class="title">ATTESTATION DE TRAVAIL</div>
<p class="intro">La Doyenne de la Faculté des Sciences &amp; Techniques de Mohammedia, atteste que :</p>
<table class="f">
<tr><td class="l">Prénom</td><td class="c">:</td><td class="v">{{ user.prenom_fr }}</td></tr>
<tr><td class="l">Nom</td><td class="c">:</td><td class="v">{{ user.nom_fr }}</td></tr>
<tr><td class="l">Grade</td><td class="c">:</td><td class="v">{{ user.grade_fr }}</td></tr>
<tr><td class="l">DOTI</td><td class="c">:</td><td class="v">{{ user.doti }}</td></tr>
</table>
<p class="ex">Exerce ses fonctions au sein de notre établissement.</p>
<p class="cl">Cette attestation est délivrée à l'intéressé(e), sur sa demande, pour servir et valoir ce que de droit.</p>
<div class="fd">Mohammedia le &nbsp;&nbsp; {{ request.date_edition }}</div>
</body></html>
HTML; }

    private function employeAr(): string { return <<<'HTML'
<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
<style>
@page { margin:1.5cm 2.5cm 2cm 2.5cm; size:A4 portrait; }
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:"Amiri","DejaVu Sans",serif;font-size:14pt;color:#000;direction:rtl;text-align:right;}
.hi{width:112%;display:block;margin-left:-6%;} .hb{margin-bottom:60px;}
.title{text-align:center;font-size:20pt;font-weight:900;margin-bottom:40px;}
.intro{font-size:13pt;font-weight:bold;text-align:right;margin-bottom:25px;line-height:1.9;}
table.f{width:100%;border-collapse:collapse;direction:rtl;}
table.f td{font-weight:bold;font-size:13pt;padding:5px 0;vertical-align:top;line-height:1.9;}
td.l{width:160px;font-weight:900;white-space:nowrap;text-align:right;}
td.c{width:20px;text-align:center;font-weight:900;}
td.v{font-weight:bold;text-align:right;}
.cl{font-size:13pt;font-weight:bold;text-align:justify;line-height:2;margin-top:28px;direction:rtl;}
.fd{text-align:right;margin-top:70px;font-size:11pt;font-weight:bold;direction:rtl;}
</style></head><body>
<div class="hb"><img class="hi" src="{{ asset.entete }}" /></div>
<div class="title">شهادة العمل</div>
<p class="intro">تشهد عميدة كلية العلوم و التقنيات بأن السيد(ة) :</p>
<table class="f">
<tr><td class="l">الإسم الشخصي</td><td class="c">:</td><td class="v">{{ user.prenom_ar }}</td></tr>
<tr><td class="l">الإسم العائلي</td><td class="c">:</td><td class="v">{{ user.nom_ar }}</td></tr>
<tr><td class="l">الإطار</td><td class="c">:</td><td class="v">{{ user.grade_ar }}</td></tr>
<tr><td class="l">رقم التأجير</td><td class="c">:</td><td class="v">{{ user.doti }}</td></tr>
</table>
<p class="cl">تعمل بهذه المؤسسة و قد سلمت له(ا) هذه الشهادة بطلب منه(ا) للإدلاء بها عند الحاجة.</p>
<div class="fd">{{ request.date_edition }} &nbsp; المحمدية في</div>
</body></html>
HTML; }

    private function professeurFr(): string { return <<<'HTML'
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<style>
@page { margin:0; size:A4 portrait; }
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:"DejaVu Sans",Arial,sans-serif;font-size:11.5pt;color:#000;padding:1.5cm 2.5cm 2cm 2.5cm;}
.hi{width:112%;display:block;margin-left:-6%;} .hb{margin-bottom:60px;}
.title{text-align:center;font-size:16pt;font-weight:900;letter-spacing:3px;text-decoration:underline;margin-bottom:38px;}
.intro{font-size:11.5pt;font-weight:bold;text-align:left;margin-bottom:14px;line-height:1.6;}
table.f{width:100%;border-collapse:collapse;}
table.f td{font-weight:bold;font-size:11.5pt;padding:4px 0;vertical-align:top;line-height:1.8;}
td.l{width:110px;font-weight:900;white-space:nowrap;}
td.c{width:25px;font-weight:900;}
td.v{font-weight:bold;}
.ex{font-size:11.5pt;font-weight:bold;text-align:left;margin-top:22px;line-height:1.7;}
.fd{text-align:right;margin-top:70px;font-size:11pt;font-weight:bold;}
</style></head><body>
<div class="hb"><img class="hi" src="{{ asset.entete }}" /></div>
<div class="title">ATTESTATION DE TRAVAIL</div>
<p class="intro">La Doyenne de la Faculté des Sciences &amp; Techniques de Mohammedia, atteste que :</p>
<table class="f">
<tr><td class="l">Prénom</td><td class="c">:</td><td class="v">{{ user.prenom_fr }}</td></tr>
<tr><td class="l">Nom</td><td class="c">:</td><td class="v">{{ user.nom_fr }}</td></tr>
<tr><td class="l">Grade</td><td class="c">:</td><td class="v">{{ user.grade_fr }}</td></tr>
<tr><td class="l">DOTI</td><td class="c">:</td><td class="v">{{ user.doti }}</td></tr>
</table>
<p class="ex">Exerce en qualité de Professeur-Chercheur au sein de notre établissement.<br>Et que cette attestation lui a été délivrée à sa demande pour servir et valoir ce que de droit.</p>
<div class="fd">Mohammedia le &nbsp;&nbsp; {{ request.date_edition }}</div>
</body></html>
HTML; }

    private function professeurAr(): string { return <<<'HTML'
<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
<style>
@page { margin:1.5cm 2.5cm 2cm 2.5cm; size:A4 portrait; }
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:"Amiri","DejaVu Sans",serif;font-size:14pt;color:#000;direction:rtl;text-align:right;}
.hi{width:112%;display:block;margin-left:-6%;} .hb{margin-bottom:60px;}
.title{text-align:center;font-size:20pt;font-weight:900;margin-bottom:40px;}
.intro{font-size:13pt;font-weight:bold;text-align:right;margin-bottom:25px;line-height:1.9;}
table.f{width:100%;border-collapse:collapse;direction:rtl;}
table.f td{font-weight:bold;font-size:13pt;padding:5px 0;vertical-align:top;line-height:1.9;}
td.l{width:160px;font-weight:900;white-space:nowrap;text-align:right;}
td.c{width:20px;text-align:center;font-weight:900;}
td.v{font-weight:bold;text-align:right;}
.cl{font-size:13pt;font-weight:bold;text-align:justify;line-height:2;margin-top:28px;direction:rtl;}
.fd{text-align:right;margin-top:70px;font-size:11pt;font-weight:bold;direction:rtl;}
</style></head><body>
<div class="hb"><img class="hi" src="{{ asset.entete }}" /></div>
<div class="title">شهادة العمل</div>
<p class="intro">تشهد عميدة كلية العلوم والتقنيات بالمحمدية بأن السيد(ة) :</p>
<table class="f">
<tr><td class="l">الإسم الشخصي</td><td class="c">:</td><td class="v">{{ user.prenom_ar }}</td></tr>
<tr><td class="l">الإسم العائلي</td><td class="c">:</td><td class="v">{{ user.nom_ar }}</td></tr>
<tr><td class="l">الإطار</td><td class="c">:</td><td class="v">{{ user.grade_ar }}</td></tr>
<tr><td class="l">رقم التأجير</td><td class="c">:</td><td class="v">{{ user.doti }}</td></tr>
</table>
<p class="cl">يعمل أستاذ(ة) باحث(ة) بهذه المؤسسة.<br><br>و قد سلمت له(ا) هذه الشهادة بطلب منه(ا) للإدلاء بها عند الحاجة.</p>
<div class="fd">{{ request.date_edition }} &nbsp; المحمدية في</div>
</body></html>
HTML; }

    private function aqtEmployeFr(): string { return <<<'HTML'
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<style>
@page { margin:0; size:A4 portrait; }
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:"DejaVu Sans",Arial,sans-serif;font-size:11.5pt;color:#000;padding:1.5cm 2.5cm 2cm 2.5cm;}
.hi{width:112%;display:block;margin-left:-6%;} .hb{margin-bottom:45px;}
.title{text-align:center;font-size:14pt;font-weight:900;margin-bottom:28px;}
.p{font-size:11.5pt;text-align:justify;line-height:1.7;margin-bottom:12px;}
.intro{text-indent:40px;}
.vu{font-weight:bold;}
.red{color:#c00000;font-weight:bold;}
.decide{text-align:center;font-size:14pt;font-weight:900;text-decoration:underline;margin:18px 0 20px 0;}
.art{font-weight:bold;}
.art u{font-weight:900;}
table.f{width:100%;border-collapse:collapse;margin:6px 0 12px 0;}
table.f td{font-weight:bold;font-size:11.5pt;padding:5px 0;vertical-align:top;line-height:1.6;}
td.l{width:110px;font-weight:900;white-space:nowrap;}
td.c{width:25px;font-weight:900;}
td.v{color:#c00000;font-weight:bold;}
.fd{text-align:right;margin-top:55px;font-size:11.5pt;}
</style></head><body>
<div class="hb"><img class="hi" src="{{ asset.entete }}" /></div>
<div class="title">AUTORISATION DE QUITTER LE TERRITOIRE NATIONAL</div>
<p class="p intro">La Doyenne de la Faculté des Sciences et Techniques de Mohammedia,</p>
<p class="p">Vu le Dahir n° 008.5801 en date du 4 Chaabane 1377 (24 Février 1958) portant statut général de la fonction public.</p>
<p class="p vu">Vu la demande de l'intéressé (e) en date du <span class="red">{{ request.date_demande }}</span></p>
<div class="decide">DECIDE</div>
<p class="p art"><u>Article 1</u> : à Compter <span class="red">du {{ request.date_debut }}&nbsp;&nbsp;au&nbsp;&nbsp;{{ request.date_fin }}</span></p>
<table class="f">
<tr><td class="l">{{ user.civilite_fr }}</td><td class="c">:</td><td class="v">{{ user.nom_complet_fr }}</td></tr>
<tr><td class="l">Grade</td><td class="c">:</td><td class="v">{{ user.grade_fr }}</td></tr>
<tr><td class="l">N° DOTI</td><td class="c">:</td><td class="v">{{ user.doti }}</td></tr>
</table>
<p class="p">Est autorisé(e) à quitter le territoire national durant la période précité pour se rendre en <span class="red">{{ request.destination }}</span>.</p>
<p class="p art"><u>Article 2</u> : L'intéressé(e) est tenu(e) d'aviser de sa reprise de service le lendemain de l'expiration de son congé exceptionnel.</p>
<div class="fd">Mohammedia le &nbsp; <span class="red">{{ request.date_edition }}</span></div>
</body></html>
HTML; }

    private function aqtProfesseurFr(): string { return <<<'HTML'
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<style>
@page { margin:0; size:A4 portrait; }
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:"DejaVu Sans",Arial,sans-serif;font-size:11.5pt;color:#000;padding:1.5cm 2.5cm 2cm 2.5cm;}
.hi{width:112%;display:block;margin-left:-6%;} .hb{margin-bottom:45px;}
.title{text-align:center;font-size:14pt;font-weight:900;margin-bottom:28px;}
.p{font-size:11.5pt;text-align:justify;line-height:1.7;margin-bottom:12px;}
.intro{text-indent:40px;}
.vu{font-weight:bold;}
.red{color:#c00000;font-weight:bold;}
.decide{text-align:center;font-size:14pt;font-weight:900;text-decoration:underline;margin:18px 0 20px 0;}
.art{font-weight:bold;}
.art u{font-weight:900;}
table.f{width:100%;border-collapse:collapse;margin:6px 0 12px 0;}
table.f td{font-weight:bold;font-size:11.5pt;padding:5px 0;vertical-align:top;line-height:1.6;}
td.l{width:110px;font-weight:900;white-space:nowrap;}
td.c{width:25px;font-weight:900;}
td.v{color:#c00000;font-weight:bold;}
.fd{text-align:right;margin-top:55px;font-size:11.5pt;}
</style></head><body>
<div class="hb"><img class="hi" src="{{ asset.entete }}" /></div>
<div class="title">AUTORISATION DE QUITTER LE TERRITOIRE NATIONAL</div>
<p class="p intro">La Doyenne de la Faculté des Sciences et Techniques de Mohammedia,</p>
<p class="p">Vu le Dahir n° 008.5801 en date du 4 Chaabane 1377 (24 Février 1958) portant statut général de la fonction public.</p>
<p class="p vu">Vu la demande de l'intéressé (e) en date du <span class="red">{{ request.date_demande }}</span></p>
<div class="decide">DECIDE</div>
<p class="p art"><u>Article 1</u> : à Compter <span class="red">du {{ request.date_debut }}&nbsp;&nbsp;au&nbsp;&nbsp;{{ request.date_fin }}</span></p>
<table class="f">
<tr><td class="l">{{ user.civilite_fr }}</td><td class="c">:</td><td class="v">{{ user.nom_complet_fr }}</td></tr>
<tr><td class="l">Grade</td><td class="c">:</td><td class="v">{{ user.grade_fr }}</td></tr>
<tr><td class="l">N° DOTI</td><td class="c">:</td><td class="v">{{ user.doti }}</td></tr>
</table>
<p class="p">Est autorisé(e) à quitter le territoire national durant la période précité pour se rendre en <span class="red">{{ request.destination }}</span>.</p>
<p class="p art"><u>Article 2</u> : L'intéressé(e) est tenu(e) d'aviser de sa reprise de service le lendemain de l'expiration de son séjour.</p>
<p class="p art"><u>Article 3</u> : L'intéressé(e) est tenu(e) de remettre un rapport contresigné par le responsable de l'entité d'accueil.</p>
<div class="fd">Mohammedia le &nbsp; <span class="red">{{ request.date_edition }}</span></div>
</body></html>
HTML; }

    private function odmFr(): string { return <<<'HTML'
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<style>
@page { margin:0; size:A4 portrait; }
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:"DejaVu Sans",Arial,sans-serif;font-size:12pt;color:#000;padding:1.5cm 2.5cm 2cm 2.5cm;}
.hi{width:112%;display:block;margin-left:-6%;} .hb{margin-bottom:70px;}
.title{text-align:center;font-size:16pt;font-weight:900;letter-spacing:2px;text-decoration:underline;margin-bottom:55px;}
table.f{width:100%;border-collapse:collapse;margin:0 auto;}
table.f td{font-weight:bold;font-size:12pt;padding:9px 0;vertical-align:top;line-height:1.7;}
td.l{width:200px;font-weight:900;white-space:nowrap;}
td.c{width:22px;font-weight:900;}
td.v{font-weight:bold;}
.fd{text-align:right;margin-top:120px;font-size:12pt;font-weight:bold;}
</style></head><body>
<div class="hb"><img class="hi" src="{{ asset.entete }}" /></div>
<div class="title">ORDRE DE MISSION</div>
<table class="f">
<tr><td class="l">Prénom &amp; Nom</td><td class="c">:</td><td class="v">{{ user.nom_complet_fr }}</td></tr>
<tr><td class="l">Grade</td><td class="c">:</td><td class="v">{{ user.grade_fr }}</td></tr>
<tr><td class="l">Destination</td><td class="c">:</td><td class="v">{{ request.destination }}</td></tr>
<tr><td class="l">Date de Départ</td><td class="c">:</td><td class="v">{{ request.date_debut }}</td></tr>
<tr><td class="l">Date de Retour</td><td class="c">:</td><td class="v">{{ request.date_fin }}</td></tr>
<tr><td class="l">Objet</td><td class="c">:</td><td class="v">{{ request.objet }}</td></tr>
<tr><td class="l">Moyen de Transport</td><td class="c">:</td><td class="v">{{ request.moyen_transport }}</td></tr>
</table>
<div class="fd">Mohammedia le &nbsp; {{ request.date_edition }}</div>
</body></html>
HTML; }

    private function attHabFr(): string { return <<<'HTML'
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<style>
@page { margin:0; size:A4 portrait; }
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:"DejaVu Sans",Arial,sans-serif;font-size:11.5pt;color:#000;padding:1.5cm 2.5cm 2cm 2.5cm;}
.hi{width:112%;display:block;margin-left:-6%;} .hb{margin-bottom:60px;}
.title{text-align:center;font-size:16pt;font-weight:900;letter-spacing:3px;text-decoration:underline;margin-bottom:38px;}
.intro{font-size:11.5pt;font-weight:bold;text-align:left;margin-bottom:14px;line-height:1.6;}
table.f{width:100%;border-collapse:collapse;}
table.f td{font-weight:bold;font-size:11.5pt;padding:4px 0;vertical-align:top;line-height:1.8;}
td.l{width:110px;font-weight:900;white-space:nowrap;}
td.c{width:25px;font-weight:900;}
td.v{font-weight:bold;}
.ex{font-size:11.5pt;font-weight:bold;text-align:left;margin-top:22px;line-height:1.7;}
.ex u{font-weight:900;}
.cl{font-size:11.5pt;font-weight:bold;text-align:justify;line-height:1.7;margin-top:6px;}
.fd{text-align:right;margin-top:70px;font-size:11pt;font-weight:bold;}
</style></head><body>
<div class="hb"><img class="hi" src="{{ asset.entete }}" /></div>
<div class="title">ATTESTATION</div>
<p class="intro">La Doyenne de la Faculté des Sciences &amp; Techniques de Mohammedia, atteste que par la présente que :</p>
<table class="f">
<tr><td class="l">Nom</td><td class="c">:</td><td class="v">{{ user.nom_fr }}</td></tr>
<tr><td class="l">Prénom</td><td class="c">:</td><td class="v">{{ user.prenom_fr }}</td></tr>
<tr><td class="l">DOTI</td><td class="c">:</td><td class="v">{{ user.doti }}</td></tr>
</table>
<p class="ex">Exerce ses fonctions d'Enseignant Chercheur en <u>tant que {{ user.grade_fr }} depuis le {{ request.date_habilitation }}</u>.</p>
<p class="cl">Cette attestation est délivrée à l'intéressé(e), sur sa demande, pour servir et valoir ce que de droit.</p>
<div class="fd">Mohammedia le &nbsp;&nbsp; {{ request.date_edition }}</div>
</body></html>
HTML; }

    private function pvRepriseAr(): string { return <<<'HTML'
<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
<style>
@page { margin:1.5cm 2.5cm 2cm 2.5cm; size:A4 portrait; }
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:"Amiri","DejaVu Sans",serif;font-size:14pt;color:#000;direction:rtl;text-align:right;}
.hi{width:112%;display:block;margin-left:-6%;} .hb{margin-bottom:70px;}
.intro{font-size:14pt;font-weight:bold;text-align:center;margin-bottom:40px;line-height:1.9;}
table.f{width:100%;border-collapse:collapse;direction:rtl;margin-bottom:30px;}
table.f td{font-weight:bold;font-size:14pt;padding:8px 0;vertical-align:top;line-height:1.9;}
td.l{width:150px;font-weight:900;white-space:nowrap;text-align:right;}
td.c{width:20px;text-align:center;font-weight:900;}
td.v{font-weight:bold;text-align:right;}
.p{font-size:14pt;font-weight:bold;text-align:right;line-height:2;margin-bottom:14px;direction:rtl;}
.b{font-weight:900;}
.fd{text-align:right;margin-top:40px;font-size:13pt;font-weight:bold;direction:rtl;}
table.sig{width:100%;border-collapse:collapse;direction:rtl;margin-top:90px;}
table.sig td{font-size:12pt;font-weight:bold;text-align:center;width:50%;}
</style></head><body>
<div class="hb"><img class="hi" src="{{ asset.entete }}" /></div>
<p class="intro">تشهد عميدة كلية العلوم و التقنيات بالمحمدية أن :</p>
<table class="f">
<tr><td class="l">السيد(ة)</td><td class="c">:</td><td class="v">{{ user.prenom_ar }} {{ user.nom_ar }}</td></tr>
<tr><td class="l">الإطار</td><td class="c">:</td><td class="v">{{ user.grade_ar }}</td></tr>
<tr><td class="l">رقم التأجير</td><td class="c">:</td><td class="v">{{ user.doti }}</td></tr>
</table>
<p class="p">قد استأنف(ت) عمله(ا) بتاريخ <span class="b">{{ request.date_reprise }}</span></p>
<p class="p">بعد استفادته(ا) من <span class="b">{{ request.type_conge }}</span> ما بين :</p>
<p class="p"><span class="b">{{ request.date_debut }}</span> إلى غاية <span class="b">{{ request.date_fin }}</span>.</p>
<div class="fd">المحمدية في &nbsp;&nbsp; {{ request.date_edition }}</div>
<table class="sig">
<tr><td>توقيع المعني بالأمر</td><td>توقيع رئيس المؤسسة</td></tr>
</table>
</body></html>
HTML; }

    private function congeAdmAr(): string { return <<<'HTML'
<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
<style>
@page { margin:1.5cm 2.5cm 2cm 2.5cm; size:A4 portrait; }
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:"Amiri","DejaVu Sans",serif;font-size:14pt;color:#000;direction:rtl;text-align:right;}
.hi{width:112%;display:block;margin-left:-6%;} .hb{margin-bottom:55px;}
.title{text-align:center;font-size:22pt;font-weight:900;letter-spacing:2px;text-decoration:underline;margin-bottom:40px;}
.ref{font-size:14pt;font-weight:bold;text-align:right;margin-bottom:34px;}
.intro{font-size:14pt;font-weight:900;text-align:right;margin-bottom:22px;line-height:1.9;}
table.f{width:100%;border-collapse:collapse;direction:rtl;margin-bottom:26px;}
table.f td{font-weight:bold;font-size:14pt;padding:8px 0;vertical-align:top;line-height:1.9;}
td.l{width:150px;font-weight:900;white-space:nowrap;text-align:right;}
td.c{width:20px;text-align:center;font-weight:900;}
td.v{font-weight:bold;text-align:right;}
.p{font-size:14pt;font-weight:bold;text-align:justify;line-height:2.1;margin-bottom:16px;direction:rtl;}
.b{font-weight:900;}
.fd{text-align:right;margin-top:55px;font-size:13pt;font-weight:bold;direction:rtl;}
</style></head><body>
<div class="hb"><img class="hi" src="{{ asset.entete }}" /></div>
<div class="title">رخصــة إداريــة</div>
<p class="ref">المرجع رقم :</p>
<p class="intro">تأذن عميدة كلية العلوم و التقنيات بالمحمدية :</p>
<table class="f">
<tr><td class="l">للسيد(ة)</td><td class="c">:</td><td class="v">{{ user.prenom_ar }} {{ user.nom_ar }}</td></tr>
<tr><td class="l">الإطار</td><td class="c">:</td><td class="v">{{ user.grade_ar }}</td></tr>
<tr><td class="l">رقم التأجير</td><td class="c">:</td><td class="v">{{ user.doti }}</td></tr>
</table>
<p class="p">بالاستفادة من رخصته(ا) الإدارية السنوية ابتداء من <span class="b">{{ request.date_debut }}</span> إلى غاية <span class="b">{{ request.date_fin }}</span> .</p>
<p class="p">و أن مغادرة المعني(ة) بالأمر للتراب الوطني خلال المدة السالفة الذكر لا تشكل أي إخلال بالسير العادي لهذه المؤسسة .</p>
<p class="p">على المعني بالأمر توقيع محضر استئناف العمل يوم <span class="b">{{ request.date_reprise }}</span> .</p>
<div class="fd">المحمدية في &nbsp;&nbsp; {{ request.date_edition }}</div>
</body></html>
HTML; }

    private function carteNotAr(): string { return <<<'HTML'
<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:"Amiri","DejaVu Sans",serif;font-size:10.5pt;color:#000;direction:rtl;text-align:right;}
.head{text-align:center;line-height:1.7;margin-bottom:8px;}
.head .l1{font-weight:900;font-size:12pt;}
.head .l2{font-weight:bold;font-size:11pt;}
.title{text-align:center;font-weight:900;font-size:13pt;margin:8px 0 12px 0;}
.title .yr{color:#c00000;}
table{width:100%;border-collapse:collapse;direction:rtl;margin-bottom:8px;}
td,th{border:1px solid #000;padding:5px 8px;font-size:10.5pt;vertical-align:middle;}
.bar{background:#e8e8e8;font-weight:900;font-size:11pt;text-align:center;}
.lbl{font-weight:bold;white-space:nowrap;}
.red{color:#c00000;font-weight:bold;white-space:nowrap;}
.rv{color:#c00000;font-weight:bold;}
.ctr{text-align:center;font-weight:900;}
.el{text-align:right;}
.gh{background:#f0f0f0;font-weight:900;text-align:center;}
.grade{text-align:center;}
.mtag{text-align:center;font-weight:bold;font-size:9.5pt;line-height:1.5;}
.mtag .g{font-size:11pt;font-weight:900;}
.box{display:inline-block;width:11px;height:11px;border:1px solid #000;vertical-align:middle;margin-left:4px;}
.hcell{font-weight:bold;height:26px;}
</style></head><body>

<div class="head">
<div class="l1">المملكة المغربية</div>
<div class="l2">وزارة التعليم العالي و البحث العلمي و الابتكار</div>
<div class="l2">جامعة الحسن الثاني بالدار البيضاء</div>
<div class="l2">كلية العلوم و التقنيات بالمحمدية</div>
</div>

<div class="title">بطاقة التنقيط الفردية برسم سنة <span class="yr">{{ request.annee_evaluation }}</span></div>

<!-- هوية الموظف -->
<table>
<tr><td class="bar" colspan="4">هوية الموظف</td></tr>
<tr>
  <td class="red">الاسم العائلي :</td><td class="rv">{{ user.nom_ar }}</td>
  <td class="red">رقم التأجير :</td><td class="rv">{{ user.doti }}</td>
</tr>
<tr>
  <td class="red">الاسم الشخصي :</td><td class="rv">{{ user.prenom_ar }}</td>
  <td class="red">رقم بطاقة التعريف الوطنية :</td><td class="rv">{{ user.cin }}</td>
</tr>
<tr>
  <td class="red">تاريخ الازدياد :</td><td class="rv">{{ user.date_naissance }}</td>
  <td class="lbl">مكان الازدياد :</td><td></td>
</tr>
<tr>
  <td class="red">الحالة العائلية :</td><td class="rv">{{ user.situation_familiale }}</td>
  <td class="lbl">عدد الأطفال :</td><td></td>
</tr>
<tr>
  <td class="lbl">الدرجة و مقر التعيين :</td><td></td>
  <td class="lbl">تاريخ التعيين في الدرجة :</td><td></td>
</tr>
<tr>
  <td class="lbl">الرتبة :</td><td></td>
  <td class="lbl">الأقدمية في الرتبة :</td><td></td>
</tr>
<tr>
  <td class="lbl">تاريخ ولوج الوظيفة العمومية :</td><td></td>
  <td class="lbl">منذ :</td><td></td>
</tr>
<tr>
  <td class="lbl">الوظيفة المزاولة حاليا :</td><td colspan="3"></td>
</tr>
</table>

<!-- النقطة الممنوحة -->
<table>
<tr><td class="bar" colspan="5">النقطة الممنوحة</td></tr>
<tr>
  <th class="gh" style="width:7%;">&nbsp;</th>
  <th class="gh el" style="width:43%;">عناصر التنقيط</th>
  <th class="gh" style="width:18%;">سلم التنقيط</th>
  <th class="gh" style="width:18%;">النقطة الممنوحة</th>
  <th class="gh" style="width:14%;">ملاحظات</th>
</tr>
<tr><td class="ctr">1</td><td class="el">إنجاز المهام المرتبطة بالوظيفة</td><td class="ctr">من 0 إلى 5</td><td></td><td></td></tr>
<tr><td class="ctr">2</td><td class="el">المردودية</td><td class="ctr">من 0 إلى 5</td><td></td><td></td></tr>
<tr><td class="ctr">3</td><td class="el">القدرة على التنظيم</td><td class="ctr">من 0 إلى 3</td><td></td><td></td></tr>
<tr><td class="ctr">4</td><td class="el">السلوك المهني</td><td class="ctr">من 0 إلى 4</td><td></td><td></td></tr>
<tr><td class="ctr">5</td><td class="el">البحث و الابتكار</td><td class="ctr">من 0 إلى 3</td><td></td><td></td></tr>
<tr><td class="el" colspan="3" style="font-weight:900;">مجموع النقط الجزئية (من 0 إلى 20)</td><td></td><td></td></tr>
</table>

<!-- الميزة الممنوحة -->
<table>
<tr><td class="bar" colspan="5">الميزة الممنوحة</td></tr>
<tr>
  <td class="mtag"><span class="g">ممتاز <span class="box"></span></span><br>( 20 ≤ النقطة )</td>
  <td class="mtag"><span class="g">جيد جدا <span class="box"></span></span><br>( 18 ≤ النقطة &lt; 20 )</td>
  <td class="mtag"><span class="g">جيد <span class="box"></span></span><br>( 16 ≤ النقطة &lt; 18 )</td>
  <td class="mtag"><span class="g">متوسط <span class="box"></span></span><br>( 14 ≤ النقطة &lt; 16 )</td>
  <td class="mtag"><span class="g">ضعيف <span class="box"></span></span><br>( النقطة &lt; 10 )</td>
</tr>
</table>

<!-- معدل النقط المحصل عليها -->
<table>
<tr><td class="bar" colspan="2">معدل النقط المحصل عليها</td></tr>
<tr><td class="el" colspan="2" style="font-weight:bold;">تذكير بمعدل النقط المحصل عليها خلال السنوات المطلوبة للترقية في الرتبة</td></tr>
<tr><td class="lbl" style="width:35%;">السنة الأولى :</td><td></td></tr>
<tr><td class="lbl">السنة الثانية :</td><td></td></tr>
<tr><td class="lbl">السنة الثالثة :</td><td></td></tr>
<tr><td class="lbl">معدل النقط المحصل عليها :</td><td></td></tr>
</table>

<!-- نسق الترقية في الرتبة -->
<table>
<tr><td class="bar" colspan="3">نسق الترقية في الرتبة</td></tr>
<tr>
  <td class="mtag"><span class="g">سريع <span class="box"></span></span><br>( 16 ≤ النقطة )</td>
  <td class="mtag"><span class="g">متوسط <span class="box"></span></span><br>( 10 ≤ النقطة &lt; 16 )</td>
  <td class="mtag"><span class="g">بطيء <span class="box"></span></span><br>( النقطة &lt; 10 )</td>
</tr>
</table>

<div style="margin-top:22px;font-weight:bold;font-size:10.5pt;">توقيع رئيس الإدارة</div>

</body></html>
HTML; }
}
