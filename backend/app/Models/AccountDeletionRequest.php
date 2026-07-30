<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccountDeletionRequest extends Model
{
    public const EN_ATTENTE = 'EN_ATTENTE';
    public const APPROUVEE  = 'APPROUVEE';
    public const REFUSEE    = 'REFUSEE';

    protected $fillable = [
        'user_id', 'motif', 'status', 'reponse_admin', 'traite_par', 'traite_le',
    ];

    protected function casts(): array
    {
        return ['traite_le' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function traitePar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'traite_par');
    }
}
