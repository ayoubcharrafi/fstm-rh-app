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

        $pdf = Pdf::loadHTML($html)
            ->setPaper('a4', 'portrait')
            ->setOption('isHtml5ParserEnabled', true)
            ->setOption('isRemoteEnabled', false)
            ->setOption('defaultFont', 'dejavu sans');

        $storedName = Str::uuid() . '.pdf';
        $path       = "requests/{$request->id}/{$storedName}";
        $content    = $pdf->output();

        Storage::disk('local')->put($path, $content);

        return RequestFile::create([
            'request_id'    => $request->id,
            'template_id'   => $template->id,
            'type'          => 'GENERE',
            'original_name' => "{$request->reference}.pdf",
            'stored_name'   => $storedName,
            'disk'          => 'local',
            'path'          => $path,
            'mime_type'     => 'application/pdf',
            'size'          => strlen($content),
            'sha256'        => hash('sha256', $content),
            'uploaded_by'   => Auth::id(),
        ]);
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
        $profile = $request->requester->staffProfile?->load('grade', 'organizationalUnit');
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

            // Request
            'request.reference'    => $request->reference,
            'request.language'     => $request->language ?? '',
            'request.date_edition' => now()->format('d/m/Y'),

            // Payload fields (forwarded as-is)
            'request.destination'  => $payload['destination'] ?? '',
            'request.date_debut'   => isset($payload['date_debut'])
                ? \Carbon\Carbon::parse($payload['date_debut'])->format('d/m/Y') : '',
            'request.date_fin'     => isset($payload['date_fin'])
                ? \Carbon\Carbon::parse($payload['date_fin'])->format('d/m/Y') : '',
            'request.objet'        => $payload['objet'] ?? '',
            'request.motif'        => $payload['motif'] ?? '',
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
}
