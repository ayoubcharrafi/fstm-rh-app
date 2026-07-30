<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccountDeletionRequest;
use App\Services\AuditService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AccountDeletionController extends Controller
{
    public function __construct(
        private AuditService $audit,
        private NotificationService $notifications,
    ) {}

    public function index(Request $request): JsonResponse
    {
        // withTrashed : après approbation le compte est supprimé en douceur,
        // sans quoi la demande apparaîtrait sans son demandeur.
        $deletions = AccountDeletionRequest::with(['user' => fn ($q) => $q->withTrashed()->with('staffProfile')])
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->latest()
            ->paginate(20)
            ->withQueryString();

        return response()->json($deletions);
    }

    /**
     * Approuver : le compte est désactivé puis supprimé en douceur (soft delete),
     * ce qui préserve les demandes archivées et permet un rétablissement.
     */
    public function approve(Request $request, AccountDeletionRequest $deletion): JsonResponse
    {
        if ($deletion->status !== AccountDeletionRequest::EN_ATTENTE) {
            return response()->json(['message' => 'Cette demande a déjà été traitée.'], 409);
        }

        $data = $request->validate([
            'reponse_admin' => ['nullable', 'string', 'max:1000'],
        ]);

        $user = $deletion->user;

        $deletion->update([
            'status'        => AccountDeletionRequest::APPROUVEE,
            'reponse_admin' => $data['reponse_admin'] ?? null,
            'traite_par'    => Auth::id(),
            'traite_le'     => now(),
        ]);

        $user->update(['is_active' => false]);
        $user->delete();

        $this->audit->log('account.deletion_approved', $deletion, [], $deletion->toArray(), $request);

        return response()->json($deletion->fresh());
    }

    public function reject(Request $request, AccountDeletionRequest $deletion): JsonResponse
    {
        if ($deletion->status !== AccountDeletionRequest::EN_ATTENTE) {
            return response()->json(['message' => 'Cette demande a déjà été traitée.'], 409);
        }

        $data = $request->validate([
            'reponse_admin' => ['required', 'string', 'max:1000'],
        ]);

        $deletion->update([
            'status'        => AccountDeletionRequest::REFUSEE,
            'reponse_admin' => $data['reponse_admin'],
            'traite_par'    => Auth::id(),
            'traite_le'     => now(),
        ]);

        $this->notifications->notify(
            $deletion->user,
            'account.deletion_rejected',
            'Demande de suppression refusée',
            $data['reponse_admin'],
            ['deletion_id' => $deletion->id],
        );

        $this->audit->log('account.deletion_rejected', $deletion, [], $deletion->toArray(), $request);

        return response()->json($deletion->fresh()->load('user.staffProfile'));
    }
}
