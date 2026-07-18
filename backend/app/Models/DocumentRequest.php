<?php

namespace App\Models;

use App\Enums\RequestStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class DocumentRequest extends Model
{
    use SoftDeletes;

    protected $table = 'requests';

    protected $fillable = [
        'reference', 'requester_id', 'document_type_id', 'language', 'status',
        'payload', 'admin_comment', 'rejection_reason',
        'submitted_at', 'processing_started_at', 'validated_at',
        'rejected_at', 'completed_at', 'processed_by',
    ];

    protected function casts(): array
    {
        return [
            'status'                 => RequestStatus::class,
            'payload'                => 'array',
            'submitted_at'           => 'datetime',
            'processing_started_at'  => 'datetime',
            'validated_at'           => 'datetime',
            'rejected_at'            => 'datetime',
            'completed_at'           => 'datetime',
        ];
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_id');
    }

    public function documentType(): BelongsTo
    {
        return $this->belongsTo(DocumentType::class);
    }

    public function processor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    public function statusHistories(): HasMany
    {
        return $this->hasMany(RequestStatusHistory::class, 'request_id');
    }

    public function files(): HasMany
    {
        return $this->hasMany(RequestFile::class, 'request_id');
    }
}
