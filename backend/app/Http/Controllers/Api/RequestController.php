<?php

namespace App\Http\Controllers\Api;

use App\Enums\RequestStatus;
use App\Http\Controllers\Controller;
use App\Models\DocumentRequest;
use App\Models\DocumentType;
use App\Services\AuditService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class RequestController extends Controller
{
    /**
     * Payload fields that must be filled before a request can be submitted,
     * keyed by document type code. Keep in sync with the frontend form
     * (frontend/app/requests/new/page.tsx → PayloadFields).
     *
     * @var array<string, array<int, string>>
     */
    private const REQUIRED_PAYLOAD_FIELDS = [
        'ODM'        => ['destination', 'objet', 'date_debut', 'date_fin'],
        'AQT'        => ['destination', 'date_debut', 'date_fin'],
        'ATT-HAB'    => ['date_habilitation'],
        'PV-REPRISE' => ['type_conge', 'date_debut', 'date_fin', 'date_reprise'],
        'CONGE-ADM'  => ['date_debut', 'date_fin', 'date_reprise'],
        'CARTE-NOT'  => ['annee_evaluation'],
    ];

    public function __construct(
        private AuditService $audit,
        private NotificationService $notif,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();

        $query = DocumentRequest::with(['requester.staffProfile', 'documentType'])
            ->when(! $user->isAdmin(), fn ($q) => $q->where('requester_id', $user->id))
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->document_type_id, fn ($q) => $q->where('document_type_id', $request->document_type_id))
            ->latest();

        return response()->json($query->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'document_type_id' => ['required', 'exists:document_types,id'],
            'language'         => ['nullable', 'string', 'size:2'],
            'payload'          => ['nullable', 'array'],
            'requester_id'     => ['nullable', 'exists:users,id'], // admin only
        ]);

        $user        = Auth::user();
        $requesterId = ($user->isAdmin() && isset($data['requester_id']))
            ? $data['requester_id']
            : $user->id;

        $docType = DocumentType::findOrFail($data['document_type_id']);
        $this->authorizeDocumentType($docType, $requesterId);

        if ($docType->requires_language && empty($data['language'])) {
            return response()->json(['message' => 'Language is required for this document type.'], 422);
        }

        // Reference is generated as a placeholder — replaced at submission
        $docRequest = DocumentRequest::create([
            'reference'        => 'DRAFT-' . uniqid(),
            'requester_id'     => $requesterId,
            'document_type_id' => $data['document_type_id'],
            'language'         => $data['language'] ?? null,
            'status'           => RequestStatus::Brouillon,
            'payload'          => $data['payload'] ?? null,
        ]);

        $this->audit->log('request.created', $docRequest, [], [], $request);

        return response()->json($docRequest->load('documentType'), 201);
    }

    public function show(DocumentRequest $documentRequest): JsonResponse
    {
        $user = Auth::user();

        if (! $user->isAdmin() && $documentRequest->requester_id !== $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json(
            $documentRequest->load([
                'requester.staffProfile.grade',
                'requester.staffProfile.organizationalUnit',
                'documentType',
                'statusHistories.changedBy',
                'files',
            ])
        );
    }

    public function update(Request $request, DocumentRequest $documentRequest): JsonResponse
    {
        $user = Auth::user();

        if ($documentRequest->requester_id !== $user->id && ! $user->isAdmin()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($documentRequest->status !== RequestStatus::Brouillon) {
            return response()->json(['message' => 'Only draft requests can be modified.'], 422);
        }

        $data = $request->validate([
            'language' => ['nullable', 'string', 'size:2'],
            'payload'  => ['nullable', 'array'],
        ]);

        $documentRequest->update($data);
        return response()->json($documentRequest->fresh());
    }

    /**
     * Submit: generate the real reference, transition to EN_ATTENTE, notify admin.
     */
    public function submit(Request $request, DocumentRequest $documentRequest): JsonResponse
    {
        $user = Auth::user();

        if ($documentRequest->requester_id !== $user->id && ! $user->isAdmin()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        // Enforce that all required payload fields are filled before submitting.
        $missing = $this->missingRequiredFields($documentRequest);
        if (! empty($missing)) {
            return response()->json([
                'message' => 'Veuillez remplir tous les champs obligatoires avant de soumettre la demande.',
                'errors'  => ['payload' => $missing],
            ], 422);
        }

        return $this->transition($request, $documentRequest, RequestStatus::EnAttente, function ($dr) {
            DB::transaction(function () use ($dr) {
                // Generate real reference at submission time
                $reference = $this->generateReference($dr->document_type_id);
                $dr->update(['submitted_at' => now(), 'reference' => $reference]);
            });

            // Notify requester
            $this->notif->notify(
                $dr->requester,
                'request.submitted',
                'Demande soumise',
                "Votre demande {$dr->reference} a été soumise et est en attente de traitement."
            );
        });
    }

    /**
     * Return the list of required payload fields that are empty for this
     * request's document type. Empty list means the request is complete.
     *
     * @return array<int, string>
     */
    private function missingRequiredFields(DocumentRequest $documentRequest): array
    {
        $code     = $documentRequest->documentType->code ?? null;
        $required = self::REQUIRED_PAYLOAD_FIELDS[$code] ?? [];
        $payload  = $documentRequest->payload ?? [];

        $missing = [];
        foreach ($required as $field) {
            $value = $payload[$field] ?? null;
            if ($value === null || (is_string($value) && trim($value) === '')) {
                $missing[] = $field;
            }
        }

        return $missing;
    }

    public function cancel(Request $request, DocumentRequest $documentRequest): JsonResponse
    {
        $user = Auth::user();

        if ($documentRequest->requester_id !== $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return $this->transition($request, $documentRequest, RequestStatus::Annulee);
    }

    // --- Admin actions ---

    public function startProcessing(Request $request, DocumentRequest $documentRequest): JsonResponse
    {
        return $this->transition($request, $documentRequest, RequestStatus::EnCours, function ($dr) {
            $dr->update(['processing_started_at' => now(), 'processed_by' => Auth::id()]);

            // Notify requester
            $this->notif->notify(
                $dr->requester,
                'request.processing',
                'Demande en cours',
                "Votre demande {$dr->reference} est en cours de traitement par l'administration."
            );
        });
    }

    public function validate(Request $request, DocumentRequest $documentRequest): JsonResponse
    {
        $data = $request->validate(['comment' => ['nullable', 'string', 'max:500']]);

        return $this->transition($request, $documentRequest, RequestStatus::Validee, function ($dr) use ($data) {
            $dr->update([
                'validated_at'  => now(),
                'admin_comment' => $data['comment'] ?? null,
            ]);

            // Notify requester
            $this->notif->notify(
                $dr->requester,
                'request.validated',
                'Demande validée',
                "Votre demande {$dr->reference} a été validée. Le document sera bientôt disponible."
            );
        });
    }

    public function reject(Request $request, DocumentRequest $documentRequest): JsonResponse
    {
        $data = $request->validate(['rejection_reason' => ['required', 'string', 'max:1000']]);

        return $this->transition($request, $documentRequest, RequestStatus::Rejetee, function ($dr) use ($data) {
            $dr->update([
                'rejected_at'      => now(),
                'rejection_reason' => $data['rejection_reason'],
            ]);

            $this->notif->notify(
                $dr->requester,
                'request.rejected',
                'Demande rejetée',
                "Votre demande {$dr->reference} a été rejetée : {$data['rejection_reason']}"
            );
        });
    }

    // --- Helpers ---

    private function transition(
        Request $request,
        DocumentRequest $docRequest,
        RequestStatus $to,
        ?callable $after = null
    ): JsonResponse {
        $from = $docRequest->status;

        if (! $from->canTransitionTo($to)) {
            return response()->json([
                'message' => "Transition {$from->value} → {$to->value} non autorisée.",
            ], 422);
        }

        DB::transaction(function () use ($docRequest, $from, $to, $after) {
            $docRequest->update(['status' => $to]);

            $docRequest->statusHistories()->create([
                'old_status' => $from->value,
                'new_status' => $to->value,
                'changed_by' => Auth::id(),
            ]);

            if ($after) {
                $after($docRequest->fresh());
            }
        });

        $this->audit->log(
            'request.status_changed',
            $docRequest,
            ['status' => $from->value],
            ['status' => $to->value],
            $request
        );

        return response()->json($docRequest->fresh()->load('statusHistories'));
    }

    private function authorizeDocumentType(DocumentType $docType, int $requesterId): void
    {
        if ($docType->allowed_role === 'TOUS') {
            return;
        }

        $requester = \App\Models\User::findOrFail($requesterId);

        if ($docType->allowed_role !== $requester->role->value) {
            abort(403, 'Type de document non autorisé pour ce rôle.');
        }
    }

    /**
     * Generate final reference at submission — format: CODE/0001/YYYY
     */
    private function generateReference(int $documentTypeId): string
    {
        $docType = DocumentType::find($documentTypeId);
        $year    = date('Y');

        // Count only submitted (non-draft) requests for this type this year
        $count = DocumentRequest::whereYear('submitted_at', $year)
            ->where('document_type_id', $documentTypeId)
            ->where('status', '!=', RequestStatus::Brouillon->value)
            ->lockForUpdate()
            ->count();

        return sprintf('%s/%04d/%s', $docType->code, $count + 1, $year);
    }
}
