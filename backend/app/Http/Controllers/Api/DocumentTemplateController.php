<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DocumentTemplate;
use App\Models\DocumentType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DocumentTemplateController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $templates = DocumentTemplate::with('documentType')
            ->when($request->document_type_id, fn ($q) => $q->where('document_type_id', $request->document_type_id))
            ->when($request->language, fn ($q) => $q->where('language', $request->language))
            ->orderByDesc('version')
            ->paginate(20);

        return response()->json($templates);
    }

    public function show(DocumentTemplate $template): JsonResponse
    {
        return response()->json($template->load('documentType'));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'document_type_id' => ['required', 'exists:document_types,id'],
            'language'         => ['required', 'string', 'size:2'],
            'role_target'      => ['nullable', 'in:PROFESSEUR,EMPLOYE'],
            'content'          => ['required', 'string'],
            'is_active'        => ['boolean'],
        ]);

        // Auto-increment version for same type+language+role_target
        $lastVersion = DocumentTemplate::where('document_type_id', $data['document_type_id'])
            ->where('language', $data['language'])
            ->where('role_target', $data['role_target'] ?? null)
            ->max('version') ?? 0;

        $data['version']    = $lastVersion + 1;
        $data['created_by'] = Auth::id();

        // If new template is active, deactivate previous ones for same type+lang+role
        if ($data['is_active'] ?? true) {
            DocumentTemplate::where('document_type_id', $data['document_type_id'])
                ->where('language', $data['language'])
                ->where('role_target', $data['role_target'] ?? null)
                ->update(['is_active' => false]);

            $data['is_active'] = true;
        }

        $template = DocumentTemplate::create($data);

        return response()->json($template->load('documentType'), 201);
    }

    public function update(Request $request, DocumentTemplate $template): JsonResponse
    {
        $data = $request->validate([
            'content'   => ['sometimes', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        // Activating this template deactivates others for same type+lang+role
        if (isset($data['is_active']) && $data['is_active']) {
            DocumentTemplate::where('document_type_id', $template->document_type_id)
                ->where('language', $template->language)
                ->where('role_target', $template->role_target)
                ->where('id', '!=', $template->id)
                ->update(['is_active' => false]);
        }

        $template->update($data);

        return response()->json($template->fresh()->load('documentType'));
    }

    /**
     * Soft-deactivate — never hard delete a template already used.
     */
    public function destroy(DocumentTemplate $template): JsonResponse
    {
        $isUsed = \App\Models\RequestFile::where('template_id', $template->id)->exists();

        if ($isUsed) {
            $template->update(['is_active' => false]);
            return response()->json(['message' => 'Template deactivated (used by existing documents).']);
        }

        $template->delete();
        return response()->json(['message' => 'Template deleted.']);
    }

    /**
     * Return a preview render of a template with dummy data.
     */
    public function preview(DocumentTemplate $template): JsonResponse
    {
        $dummy = [
            'user.nom_fr'          => 'Bensalem',
            'user.prenom_fr'       => 'Ahmed',
            'user.nom_ar'          => 'بنسالم',
            'user.prenom_ar'       => 'أحمد',
            'user.doti'            => 'DOTI-0001',
            'user.grade_fr'        => 'Professeur de l\'enseignement supérieur, grade C',
            'user.grade_ar'        => 'أستاذ التعليم العالي، درجة ج',
            'user.unite_fr'        => 'Informatique',
            'user.date_recrutement'=> '01/09/2010',
            'request.reference'    => 'ATT-TRAV-FR/0001/2026',
            'request.date_edition' => now()->format('d/m/Y'),
            'request.destination'  => 'Paris, France',
            'request.date_debut'   => '01/08/2026',
            'request.date_fin'     => '15/08/2026',
            'request.objet'        => 'Participation à une conférence internationale',
        ];

        $content = $template->content;
        foreach ($dummy as $key => $value) {
            $content = str_replace('{{ ' . $key . ' }}', $value, $content);
            $content = str_replace('{{' . $key . '}}', $value, $content);
        }

        // Inject header image for preview
        $headerImagePath = public_path('entete-attestation.png');
        if (file_exists($headerImagePath)) {
            $b64     = base64_encode(file_get_contents($headerImagePath));
            $dataUri = 'data:image/png;base64,' . $b64;
        } else {
            $dataUri = '';
        }
        $content = str_replace('{{ asset.entete }}', $dataUri, $content);
        $content = str_replace('{{asset.entete}}',   $dataUri, $content);

        return response()->json(['html' => $content]);
    }
}
