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

        $templates = [
            ['language' => 'fr', 'role_target' => 'EMPLOYE',    'label' => 'ATT Employé FR',    'content' => $this->employeFr()],
            ['language' => 'ar', 'role_target' => 'EMPLOYE',    'label' => 'ATT Employé AR',    'content' => $this->employeAr()],
            ['language' => 'fr', 'role_target' => 'PROFESSEUR', 'label' => 'ATT Professeur FR', 'content' => $this->professeurFr()],
            ['language' => 'ar', 'role_target' => 'PROFESSEUR', 'label' => 'ATT Professeur AR', 'content' => $this->professeurAr()],
        ];

        DocumentTemplate::where('document_type_id', $attTrav->id)->update(['is_active' => false]);

        foreach ($templates as $tpl) {
            $lastVersion = DocumentTemplate::where('document_type_id', $attTrav->id)
                ->where('language', $tpl['language'])
                ->where('role_target', $tpl['role_target'])
                ->max('version') ?? 0;

            DocumentTemplate::create([
                'document_type_id' => $attTrav->id,
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
@page { margin:1.5cm 2.5cm 2cm 2.5cm; size:A4 portrait; }
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:"DejaVu Sans",Arial,sans-serif;font-size:11.5pt;color:#000;}
.hi{width:100%;display:block;} .hb{border-bottom:2.5px solid #000;margin-bottom:35px;}
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
.hi{width:100%;display:block;} .hb{border-bottom:2.5px solid #000;margin-bottom:35px;}
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
@page { margin:1.5cm 2.5cm 2cm 2.5cm; size:A4 portrait; }
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:"DejaVu Sans",Arial,sans-serif;font-size:11.5pt;color:#000;}
.hi{width:100%;display:block;} .hb{border-bottom:2.5px solid #000;margin-bottom:35px;}
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
.hi{width:100%;display:block;} .hb{border-bottom:2.5px solid #000;margin-bottom:35px;}
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
}
