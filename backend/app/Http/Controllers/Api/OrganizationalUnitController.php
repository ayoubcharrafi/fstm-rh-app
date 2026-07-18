<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OrganizationalUnit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrganizationalUnitController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            OrganizationalUnit::with('children')->whereNull('parent_id')->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code'      => ['required', 'string', 'max:20', 'unique:organizational_units'],
            'nom_fr'    => ['required', 'string', 'max:100'],
            'nom_ar'    => ['nullable', 'string', 'max:100'],
            'type'      => ['required', 'in:DEPARTEMENT,SERVICE,LABORATOIRE'],
            'parent_id' => ['nullable', 'exists:organizational_units,id'],
        ]);

        return response()->json(OrganizationalUnit::create($data), 201);
    }

    public function update(Request $request, OrganizationalUnit $organizationalUnit): JsonResponse
    {
        $data = $request->validate([
            'nom_fr'    => ['sometimes', 'string', 'max:100'],
            'nom_ar'    => ['nullable', 'string', 'max:100'],
            'is_active' => ['sometimes', 'boolean'],
            'parent_id' => ['nullable', 'exists:organizational_units,id'],
        ]);

        $organizationalUnit->update($data);
        return response()->json($organizationalUnit->fresh());
    }

    public function destroy(OrganizationalUnit $organizationalUnit): JsonResponse
    {
        $organizationalUnit->delete();
        return response()->json(['message' => 'Deleted.']);
    }
}
