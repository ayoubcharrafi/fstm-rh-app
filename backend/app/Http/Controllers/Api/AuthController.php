<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(private AuditService $audit) {}

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $key = 'login:' . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            return response()->json(['message' => 'Too many login attempts. Try again later.'], 429);
        }

        if (! $token = Auth::attempt($request->only('email', 'password'))) {
            RateLimiter::hit($key, 60);
            $this->audit->log('auth.login.failed', null, [], ['email' => $request->email], $request);

            throw ValidationException::withMessages(['email' => ['Invalid credentials.']]);
        }

        RateLimiter::clear($key);

        $user = Auth::user();

        if (! $user->is_active) {
            Auth::logout();
            return response()->json(['message' => 'Account disabled.'], 403);
        }

        $user->update(['last_login_at' => now()]);
        $this->audit->log('auth.login', $user, [], [], $request);

        return $this->tokenResponse($token);
    }

    public function me(): JsonResponse
    {
        $user = Auth::user()->load('staffProfile.grade', 'staffProfile.organizationalUnit');
        return response()->json($user);
    }

    public function refresh(): JsonResponse
    {
        return $this->tokenResponse(Auth::refresh());
    }

    public function logout(Request $request): JsonResponse
    {
        $this->audit->log('auth.logout', Auth::user(), [], [], $request);
        Auth::logout();
        return response()->json(['message' => 'Logged out.']);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);
        Password::sendResetLink($request->only('email'));
        return response()->json(['message' => 'If the email exists, a reset link has been sent.']);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token'    => ['required'],
            'email'    => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->forceFill(['password' => Hash::make($password)])->save();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => [__($status)]]);
        }

        return response()->json(['message' => 'Password reset successfully.']);
    }

    private function tokenResponse(string $token): JsonResponse
    {
        return response()->json([
            'access_token' => $token,
            'token_type'   => 'bearer',
            'expires_in'   => Auth::factory()->getTTL() * 60,
            'user'         => Auth::user(),
        ]);
    }
}
