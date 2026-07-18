<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RequestStatusHistory extends Model
{
    public $timestamps = true;
    public const UPDATED_AT = null;

    protected $fillable = ['request_id', 'old_status', 'new_status', 'comment', 'changed_by'];

    public function request(): BelongsTo
    {
        return $this->belongsTo(DocumentRequest::class, 'request_id');
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
