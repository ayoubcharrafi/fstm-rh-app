<?php

namespace App\Services;

use App\Models\DocumentRequest;
use App\Models\DocumentTemplate;
use App\Models\RequestFile;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DompdfDocumentGenerator implements DocumentGeneratorInterface
{
    public function generate(DocumentRequest $request): RequestFile
    {
        $template = $this->resolveTemplate($request);
        $html     = $this->renderTemplate($template->content, $request);

        // Arabic requires proper glyph shaping + bidirectional (RTL) layout, which
        // Dompdf does not support (text comes out reversed/disconnected). mPDF
        // handles Arabic natively, so we route AR templates through it and keep
        // Dompdf for Latin-script (French) documents.
        $isArabic = ($template->language ?? $request->language) === 'ar';
        $content  = $isArabic
            ? $this->renderWithMpdf($html)
            : $this->renderWithDompdf($html);

        // Regenerating replaces the previous PDF instead of stacking a new
        // "Télécharger" entry each time. Only GENERE files are removed — signed
        // uploads (SIGNE) are preserved.
        $this->deletePreviousGeneratedFiles($request);

        $storedName = Str::uuid() . '.pdf';
        $path       = "requests/{$request->id}/{$storedName}";

        Storage::disk('local')->put($path, $content);

        // Build a human-readable download title (in the document language),
        // e.g. "Attestation de travail - Ahmed Bensalem - 2026.pdf".
        $safeName = $this->buildFileName($request, $template);

        return RequestFile::create([
            'request_id'    => $request->id,
            'template_id'   => $template->id,
            'type'          => 'GENERE',
            'original_name' => $safeName,
            'stored_name'   => $storedName,
            'disk'          => 'local',
            'path'          => $path,
            'mime_type'     => 'application/pdf',
            'size'          => strlen($content),
            'sha256'        => hash('sha256', $content),
            'uploaded_by'   => Auth::id(),
        ]);
    }

    /**
     * Remove previously generated PDFs (type GENERE) for this request, both the
     * stored file on disk and the RequestFile row, so regenerating replaces the
     * document rather than accumulating duplicate download entries. Signed
     * documents (type SIGNE) are never touched.
     */
    private function deletePreviousGeneratedFiles(DocumentRequest $request): void
    {
        $previous = RequestFile::where('request_id', $request->id)
            ->where('type', 'GENERE')
            ->get();

        foreach ($previous as $file) {
            if ($file->path && Storage::disk($file->disk ?? 'local')->exists($file->path)) {
                Storage::disk($file->disk ?? 'local')->delete($file->path);
            }
            $file->delete();
        }
    }

    /**
     * Build a human-readable file name for the generated PDF, localized to the
     * document language: "<document type> - <full name> - <year>.pdf".
     * Falls back to the sanitized reference if names are missing.
     */
    private function buildFileName(DocumentRequest $request, DocumentTemplate $template): string
    {
        $isArabic = ($template->language ?? $request->language) === 'ar';
        $profile  = $request->requester->staffProfile;
        $docType  = $request->documentType;

        $typeLabel = $isArabic
            ? ($docType?->nom_ar ?: $docType?->nom_fr)
            : ($docType?->nom_fr ?: $docType?->nom_ar);

        $fullName = $isArabic
            ? trim(($profile?->prenom_ar ?? '') . ' ' . ($profile?->nom_ar ?? ''))
            : trim(($profile?->prenom_fr ?? '') . ' ' . ($profile?->nom_fr ?? ''));

        // Year: last segment of the reference (ATT-TRAV/0012/2026) or now().
        $year = now()->format('Y');
        if (preg_match('#(\d{4})\s*$#', (string) $request->reference, $m)) {
            $year = $m[1];
        }

        $parts = array_filter([$typeLabel, $fullName ?: null, $year]);
        $title = implode(' - ', $parts);

        // No usable title → fall back to the reference.
        if ($title === '' || $title === $year) {
            $title = str_replace(['/', '\\'], '-', (string) $request->reference);
        }

        // Strip characters illegal in file names; keep letters (incl. Arabic),
        // digits, spaces and a few separators.
        $title = preg_replace('#[/\\\\:*?"<>|]+#u', '-', $title);
        $title = trim(preg_replace('#\s+#u', ' ', $title));

        return $title . '.pdf';
    }

    /**
     * Render Latin-script (French) documents with Dompdf.
     */
    private function renderWithDompdf(string $html): string
    {
        $pdf = Pdf::loadHTML($html)
            ->setPaper('a4', 'portrait')
            ->setOption('isHtml5ParserEnabled', true)
            ->setOption('isRemoteEnabled', false)
            ->setOption('defaultFont', 'dejavu sans');

        return $pdf->output();
    }

    /**
     * Render Arabic (RTL) documents with mPDF, which supports Arabic glyph
     * shaping and bidirectional text out of the box.
     */
    private function renderWithMpdf(string $html): string
    {
        $tempDir = storage_path('app/mpdf');
        if (! is_dir($tempDir)) {
            mkdir($tempDir, 0775, true);
        }

        // mPDF mis-handles `@page { size: A4 portrait; }` and spawns dozens of
        // blank pages. Page size, orientation and margins are configured on the
        // constructor instead, so strip the whole @page block from the template
        // HTML before handing it to mPDF (Dompdf still uses @page as-is).
        $html = preg_replace('/@page\s*\{[^}]*\}/i', '', $html);

        $mpdf = new \Mpdf\Mpdf([
            'mode'            => 'utf-8',
            'format'          => 'A4',
            'orientation'     => 'P',
            'margin_left'     => 25,   // 2.5cm
            'margin_right'    => 25,   // 2.5cm
            'margin_top'      => 15,   // 1.5cm
            'margin_bottom'   => 20,   // 2cm
            'tempDir'         => $tempDir,
            'autoScriptToLang' => true,
            'autoLangToFont'   => true,
        ]);

        // Right-to-left base direction for the whole document.
        $mpdf->SetDirectionality('rtl');
        $mpdf->WriteHTML($html);

        return $mpdf->Output('', \Mpdf\Output\Destination::STRING_RETURN);
    }


    private function resolveTemplate(DocumentRequest $request): DocumentTemplate
    {
        $requesterRole = $request->requester->role?->value ?? null;

        $query = DocumentTemplate::where('document_type_id', $request->document_type_id)
            ->where('is_active', true);

        // Build a query with language filter if needed
        $langQuery = $request->language
            ? (clone $query)->where('language', $request->language)
            : clone $query;

        // 1. Try: exact language + exact role
        if ($requesterRole) {
            $template = (clone $langQuery)
                ->where('role_target', $requesterRole)
                ->latest('version')
                ->first();
            if ($template) return $template;
        }

        // 2. Try: exact language + no role restriction (role_target IS NULL)
        $template = (clone $langQuery)
            ->whereNull('role_target')
            ->latest('version')
            ->first();
        if ($template) return $template;

        // 3. Fallback: any language + role match
        if ($requesterRole) {
            $template = (clone $query)
                ->where('role_target', $requesterRole)
                ->latest('version')
                ->first();
            if ($template) return $template;
        }

        // 4. Fallback: any active template for this type
        $template = $query->latest('version')->first();

        if (! $template) {
            throw new \RuntimeException(
                "No active template found for document type #{$request->document_type_id}"
            );
        }

        return $template;
    }

    /**
     * Replace {{ variable }} placeholders in template content.
     * Also replaces {{ asset.entete }} with the base64-encoded header image.
     */
    private function renderTemplate(string $content, DocumentRequest $request): string
    {
        $profile = $request->requester->staffProfile?->load('grade', 'organizationalUnit', 'employeeProfile');
        $payload = $request->payload ?? [];

        $vars = [
            // User / profile
            'user.nom_fr'          => $profile?->nom_fr ?? '',
            'user.prenom_fr'       => $profile?->prenom_fr ?? '',
            'user.nom_ar'          => $profile?->nom_ar ?? '',
            'user.prenom_ar'       => $profile?->prenom_ar ?? '',
            'user.doti'            => $profile?->doti ?? '',
            'user.cin'             => $profile?->cin ?? '',
            'user.grade_fr'        => $profile?->grade?->intitule_fr ?? '',
            'user.grade_ar'        => $profile?->grade?->intitule_ar ?? '',
            'user.unite_fr'        => $profile?->organizationalUnit?->nom_fr ?? '',
            'user.telephone'       => $profile?->telephone ?? '',
            'user.date_recrutement'=> $profile?->date_recrutement?->format('d/m/Y') ?? '',
            'user.date_naissance'  => $profile?->date_naissance?->format('d/m/Y') ?? '',
            'user.situation_familiale' => $profile?->employeeProfile?->situation_familiale ?? '',
            'user.situation_familiale_ar' => $this->situationFamilialeAr($profile?->employeeProfile?->situation_familiale),
            // Civility derived from sexe: F => Mme, otherwise Mr.
            'user.civilite_fr'     => (($profile?->sexe ?? '') === 'F') ? 'Mme' : 'Mr',
            'user.nom_complet_fr'  => trim(($profile?->prenom_fr ?? '') . ' ' . ($profile?->nom_fr ?? '')),

            // Request
            'request.reference'    => $request->reference,
            'request.language'     => $request->language ?? '',
            'request.date_edition' => now()->format('d/m/Y'),
            'request.date_demande' => $request->created_at?->format('d/m/Y') ?? now()->format('d/m/Y'),

            // Payload fields (forwarded as-is)
            'request.destination'  => $payload['destination'] ?? '',
            'request.date_debut'   => isset($payload['date_debut'])
                ? \Carbon\Carbon::parse($payload['date_debut'])->format('d/m/Y') : '',
            'request.date_fin'     => isset($payload['date_fin'])
                ? \Carbon\Carbon::parse($payload['date_fin'])->format('d/m/Y') : '',
            'request.objet'        => $payload['objet'] ?? '',
            'request.motif'        => $payload['motif'] ?? '',
            'request.moyen_transport' => $payload['moyen_transport'] ?? '',
            'request.date_habilitation' => isset($payload['date_habilitation'])
                ? \Carbon\Carbon::parse($payload['date_habilitation'])->format('d/m/Y') : '',
            'request.type_conge'   => $payload['type_conge'] ?? '',
            'request.date_reprise' => isset($payload['date_reprise'])
                ? \Carbon\Carbon::parse($payload['date_reprise'])->format('d/m/Y') : '',
            'request.annee_evaluation' => $payload['annee_evaluation'] ?? '',
        ];

        foreach ($vars as $key => $value) {
            $content = str_replace('{{ ' . $key . ' }}', e($value), $content);
            $content = str_replace('{{' . $key . '}}', e($value), $content);
        }

        // Inject header image as base64 data URI (avoids remote URL issues with dompdf)
        $headerImagePath = public_path('entete-attestation.png');
        if (file_exists($headerImagePath)) {
            $b64 = base64_encode(file_get_contents($headerImagePath));
            $dataUri = 'data:image/png;base64,' . $b64;
        } else {
            $dataUri = '';
        }
        $content = str_replace('{{ asset.entete }}', $dataUri, $content);
        $content = str_replace('{{asset.entete}}',   $dataUri, $content);

        return $content;
    }

    private function situationFamilialeAr(?string $value): string
    {
        return match ($value) {
            'Célibataire' => 'أعزب',
            'Marié(e)'    => 'متزوج(ة)',
            'Divorcé(e)'  => 'مطلق(ة)',
            'Veuf/Veuve'  => 'أرمل(ة)',
            default       => $value ?? '',
        };
    }
}
