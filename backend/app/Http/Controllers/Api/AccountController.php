<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AccountController extends Controller
{
    public function __construct(private AuditService $audit) {}

    public function changePassword(Request $request): JsonResponse
    {
        $min = Setting::passwordMin();

        $request->validate([
            'current_password' => ['required', 'string'],
            'password'         => ['required', 'string', "min:{$min}", 'confirmed'],
        ]);

        $user = $request->user();

        if (! Hash::check($request->input('current_password'), $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Le mot de passe actuel est incorrect.'],
            ]);
        }

        $user->update(['password' => Hash::make($request->input('password'))]);

        $this->audit->log('profile.password_changed', $user, [], [], $request);

        return response()->json(['message' => 'Mot de passe mis à jour.']);
    }
}
