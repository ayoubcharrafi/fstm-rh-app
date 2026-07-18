<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Grade;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GradeController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Grade::all());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code'        => ['required', 'string', 'max:20', 'unique:grades'],
            'intitule_fr' => ['required', 'string', 'max:200'],
            'intitule_ar' => ['nullable', 'string', 'max:200'],
            'staff_type'  => ['nullable', 'in:PROFESSEUR,EMPLOYE'],
        ]);

        return response()->json(Grade::create($data), 201);
    }

    public function update(Request $request, Grade $grade): JsonResponse
    {
        $data = $request->validate([
            'intitule_fr' => ['sometimes', 'string', 'max:200'],
            'intitule_ar' => ['nullable', 'string', 'max:200'],
            'staff_type'  => ['nullable', 'in:PROFESSEUR,EMPLOYE'],
            'is_active'   => ['sometimes', 'boolean'],
        ]);

        $grade->update($data);
        return response()->json($grade->fresh());
    }

    public function destroy(Grade $grade): JsonResponse
    {
        $grade->delete();
        return response()->json(['message' => 'Deleted.']);
    }
}
