<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RequestFile extends Model
{
    protected $table = 'request_files';

    protected $fillable = [
        'request_id', 'template_id', 'type', 'original_name', 'stored_name',
        'disk', 'path', 'mime_type', 'size', 'sha256', 'uploaded_by',
    ];

    public function request(): BelongsTo
    {
        return $this->belongsTo(DocumentRequest::class, 'request_id');
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(DocumentTemplate::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
