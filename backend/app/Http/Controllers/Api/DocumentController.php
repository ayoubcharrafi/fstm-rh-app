<?php

namespace App\Http\Controllers\Api;

use App\Enums\RequestStatus;
use App\Http\Controllers\Controller;
use App\Models\DocumentRequest;
use App\Models\RequestFile;
use App\Services\AuditService;
use App\Services\DocumentGeneratorInterface;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DocumentController extends Controller
{
    public function __construct(
        private AuditService $audit,
        private NotificationService $notif,
        private DocumentGeneratorInterface $generator,
    ) {}

    public function index(DocumentRequest $documentRequest): JsonResponse
    {
        $user = Auth::user();

        if (! $user->isAdmin() && $documentRequest->requester_id !== $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json($documentRequest->files);
    }

    /**
     * Stream file download — works with local disk (no S3 needed).
     */
    public function download(Request $request, RequestFile $document): Response|JsonResponse
    {
        $user       = Auth::user();
        $docRequest = $document->request;

        // GENERE & PIECE_JOINTE — admin only
        if (in_array($document->type, ['GENERE', 'PIECE_JOINTE']) && ! $user->isAdmin()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        // SIGNE — requester must own + status DOCUMENT_DISPONIBLE (or admin)
        if ($document->type === 'SIGNE') {
            if (! $user->isAdmin() && $docRequest->requester_id !== $user->id) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }
            if (! $user->isAdmin() && $docRequest->status !== RequestStatus::DocumentDisponible) {
                return response()->json(['message' => 'Document not available yet.'], 403);
            }
        }

        if (! Storage::disk($document->disk)->exists($document->path)) {
            return response()->json(['message' => 'File not found.'], 404);
        }

        $this->audit->log('document.downloaded', $document, [], ['file_id' => $document->id], $request);

        $fileContent = Storage::disk($document->disk)->get($document->path);

        return response($fileContent, 200, [
            'Content-Type'        => $document->mime_type,
            'Content-Disposition' => 'attachment; filename="' . $document->original_name . '"',
            'Content-Length'      => $document->size,
        ]);
    }

    /**
     * Admin: generate PDF from active template for a VALIDEE request.
     */
    public function generateDocument(Request $request, DocumentRequest $documentRequest): JsonResponse
    {
        if ($documentRequest->status !== RequestStatus::Validee) {
            return response()->json(['message' => 'Request must be in VALIDEE status to generate document.'], 422);
        }

        // Remove any previously generated doc for this request
        $documentRequest->files()
            ->where('type', 'GENERE')
            ->each(function (RequestFile $f) {
                Storage::disk($f->disk)->delete($f->path);
                $f->delete();
            });

        try {
            $file = $this->generator->generate($documentRequest->load('requester.staffProfile.grade', 'documentType'));
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $this->audit->log('document.generated', $documentRequest, [], ['file_id' => $file->id], $request);

        return response()->json($file, 201);
    }

    public function uploadAttachment(Request $request, DocumentRequest $documentRequest): JsonResponse
    {
        $user = Auth::user();

        if ($documentRequest->requester_id !== $user->id && ! $user->isAdmin()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $request->validate(['file' => ['required', 'file', 'mimes:pdf,docx,jpg,jpeg,png', 'max:10240']]);

        $file = $this->storeFile($request->file('file'), $documentRequest->id, 'PIECE_JOINTE');

        return response()->json($file, 201);
    }

    public function deleteAttachment(Request $request, DocumentRequest $documentRequest, RequestFile $attachment): JsonResponse
    {
        $user = Auth::user();

        if ($documentRequest->requester_id !== $user->id && ! $user->isAdmin()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($attachment->type !== 'PIECE_JOINTE') {
            return response()->json(['message' => 'Cannot delete generated or signed documents.'], 422);
        }

        Storage::disk($attachment->disk)->delete($attachment->path);
        $attachment->delete();

        return response()->json(['message' => 'Deleted.']);
    }

    public function uploadSigned(Request $request, DocumentRequest $documentRequest): JsonResponse
    {
        if ($documentRequest->status !== RequestStatus::Validee) {
            return response()->json(['message' => 'Request must be VALIDEE before uploading signed document.'], 422);
        }

        $request->validate(['file' => ['required', 'file', 'mimes:pdf', 'max:20480']]);

        $file = DB::transaction(function () use ($request, $documentRequest) {
            $f = $this->storeFile($request->file('file'), $documentRequest->id, 'SIGNE');

            $documentRequest->update([
                'status'       => RequestStatus::DocumentDisponible,
                'completed_at' => now(),
            ]);

            $documentRequest->statusHistories()->create([
                'old_status' => RequestStatus::Validee->value,
                'new_status' => RequestStatus::DocumentDisponible->value,
                'changed_by' => Auth::id(),
            ]);

            return $f;
        });

        $this->notif->notify(
            $documentRequest->requester,
            'document.available',
            'Document disponible',
            "Votre document {$documentRequest->reference} est prêt à être téléchargé."
        );

        $this->audit->log('document.signed_uploaded', $documentRequest, [], ['file_id' => $file->id], $request);

        return response()->json($file, 201);
    }

    private function storeFile(\Illuminate\Http\UploadedFile $uploadedFile, int $requestId, string $type): RequestFile
    {
        $originalName = $uploadedFile->getClientOriginalName();
        $storedName   = Str::uuid() . '.' . $uploadedFile->getClientOriginalExtension();
        $path         = "requests/{$requestId}/{$storedName}";
        $disk         = 'local';

        Storage::disk($disk)->put($path, file_get_contents($uploadedFile->getRealPath()));

        return RequestFile::create([
            'request_id'    => $requestId,
            'type'          => $type,
            'original_name' => $originalName,
            'stored_name'   => $storedName,
            'disk'          => $disk,
            'path'          => $path,
            'mime_type'     => $uploadedFile->getMimeType(),
            'size'          => $uploadedFile->getSize(),
            'sha256'        => hash_file('sha256', $uploadedFile->getRealPath()),
            'uploaded_by'   => Auth::id(),
        ]);
    }
}
