<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\PasswordResetCodeMail;
use App\Models\AuditLog;
use App\Models\PasswordResetCode;
use App\Models\Setting;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
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
        $maxAttempts = (int) Setting::get('security.login_max_attempts', 5);
        $decaySeconds = (int) Setting::get('security.login_decay_seconds', 60);
        if (RateLimiter::tooManyAttempts($key, $maxAttempts)) {
            return response()->json(['message' => 'Too many login attempts. Try again later.'], 429);
        }

        if (! $token = Auth::attempt($request->only('email', 'password'))) {
            RateLimiter::hit($key, $decaySeconds);
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

    /**
     * Étape 1 : envoi d'un code à 6 chiffres à l'adresse indiquée.
     *
     * La réponse est identique que le compte existe ou non : sinon, ce point
     * d'entrée permettrait d'énumérer les adresses enregistrées.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        $email = strtolower(trim($request->input('email')));

        // Limite par adresse ET par IP : empêche d'inonder la boîte d'un agent
        // comme de balayer des adresses depuis un même poste.
        foreach (["pwd-code:{$email}", 'pwd-code-ip:' . $request->ip()] as $cle) {
            if (RateLimiter::tooManyAttempts($cle, 5)) {
                throw ValidationException::withMessages([
                    'email' => ['Trop de demandes. Réessayez dans quelques minutes.'],
                ]);
            }
            RateLimiter::hit($cle, 900);
        }

        $user = User::where('email', $email)->first();

        if ($user) {
            // Les codes encore valides sont neutralisés : un seul code actif
            // à la fois, sinon les anciens resteraient exploitables.
            PasswordResetCode::where('email', $email)
                ->whereNull('used_at')
                ->update(['used_at' => now()]);

            $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

            PasswordResetCode::create([
                'email'      => $email,
                'code_hash'  => Hash::make($code),
                'expires_at' => now()->addMinutes(PasswordResetCode::DUREE_MINUTES),
                'ip'         => $request->ip(),
            ]);

            Mail::to($email)->send(
                new PasswordResetCodeMail($code, $user->staffProfile?->prenom_fr)
            );

            $this->audit->log('auth.reset_code_sent', $user, [], [], $request);
        }

        return response()->json([
            'message' => 'Si cette adresse correspond à un compte, un code vient d\'être envoyé.',
            'expire_dans_minutes' => PasswordResetCode::DUREE_MINUTES,
        ]);
    }

    /**
     * Étape 2 : vérification du code et enregistrement du nouveau mot de passe.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => ['required', 'email'],
            'code'     => ['required', 'string', 'digits:6'],
            'password' => ['required', 'string', 'min:' . Setting::passwordMin(), 'confirmed'],
        ]);

        $email = strtolower(trim($request->input('email')));

        $erreur = ValidationException::withMessages([
            'code' => ['Code invalide ou expiré. Demandez-en un nouveau.'],
        ]);

        $reset = PasswordResetCode::where('email', $email)
            ->whereNull('used_at')
            ->latest()
            ->first();

        if (! $reset || ! $reset->estUtilisable()) {
            throw $erreur;
        }

        if (! Hash::check($request->input('code'), $reset->code_hash)) {
            // Chaque essai manqué est compté : au cinquième, le code est mort
            // et l'agent doit en redemander un.
            $reset->increment('attempts');
            throw $erreur;
        }

        $user = User::where('email', $email)->first();

        if (! $user) {
            throw $erreur;
        }

        $reset->update(['used_at' => now()]);

        $user->forceFill(['password' => Hash::make($request->input('password'))])->save();

        $this->audit->log('auth.password_reset', $user, [], [], $request);

        return response()->json([
            'message' => 'Mot de passe réinitialisé. Vous pouvez vous connecter.',
        ]);
    }

    private function tokenResponse(string $token): JsonResponse
    {
        return response()->json([
            'access_token' => $token,
            'token_type'   => 'bearer',
            'expires_in'   => Auth::factory()->getTTL() * 60,
            // Sans le profil, l'interface retombe sur l'email en guise de nom.
            'user'         => Auth::user()->load('staffProfile.grade', 'staffProfile.organizationalUnit'),
        ]);
    }
}
