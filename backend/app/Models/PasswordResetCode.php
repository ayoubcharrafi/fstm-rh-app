<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PasswordResetCode extends Model
{
    /** Durée de validité d'un code, en minutes. */
    public const DUREE_MINUTES = 15;

    /** Nombre d'essais autorisés avant invalidation du code. */
    public const MAX_TENTATIVES = 5;

    protected $fillable = ['email', 'code_hash', 'attempts', 'expires_at', 'used_at', 'ip'];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'used_at'    => 'datetime',
            'attempts'   => 'integer',
        ];
    }

    public function estExpire(): bool
    {
        return $this->expires_at->isPast();
    }

    public function estUtilise(): bool
    {
        return $this->used_at !== null;
    }

    public function tropDeTentatives(): bool
    {
        return $this->attempts >= self::MAX_TENTATIVES;
    }

    /** Un code n'est exploitable que s'il est neuf, non expiré et non forcé. */
    public function estUtilisable(): bool
    {
        return ! $this->estUtilise() && ! $this->estExpire() && ! $this->tropDeTentatives();
    }
}
