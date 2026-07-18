<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DocumentType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DocumentTypeController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(DocumentType::orderBy('allowed_role')->orderBy('nom_fr')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code'              => ['required', 'string', 'max:30', 'unique:document_types'],
            'nom_fr'            => ['required', 'string', 'max:200'],
            'nom_ar'            => ['nullable', 'string', 'max:200'],
            'allowed_role'      => ['required', 'in:TOUS,PROFESSEUR,EMPLOYE'],
            'requires_language' => ['boolean'],
        ]);

        return response()->json(DocumentType::create($data), 201);
    }

    public function update(Request $request, DocumentType $documentType): JsonResponse
    {
        $data = $request->validate([
            'nom_fr'            => ['sometimes', 'string', 'max:200'],
            'nom_ar'            => ['nullable', 'string', 'max:200'],
            'allowed_role'      => ['sometimes', 'in:TOUS,PROFESSEUR,EMPLOYE'],
            'requires_language' => ['sometimes', 'boolean'],
            'is_active'         => ['sometimes', 'boolean'],
        ]);

        $documentType->update($data);
        return response()->json($documentType->fresh());
    }

    public function destroy(DocumentType $documentType): JsonResponse
    {
        // Prevent deletion if requests exist
        if ($documentType->requests()->count() > 0) {
            $documentType->update(['is_active' => false]);
            return response()->json(['message' => 'Des demandes existent pour ce type. Il a été désactivé.']);
        }

        $documentType->delete();
        return response()->json(['message' => 'Supprimé.']);
    }
}
