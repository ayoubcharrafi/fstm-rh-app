<?php

namespace App\Models;

use App\Enums\Role;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Tymon\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    use HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'is_active',
        'last_login_at',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'role'             => Role::class,
            'is_active'        => 'boolean',
            'email_verified_at'=> 'datetime',
            'last_login_at'    => 'datetime',
            'password'         => 'hashed',
        ];
    }

    // JWT
    public function getJWTIdentifier(): mixed
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims(): array
    {
        return [
            'role'  => $this->role->value,
            'email' => $this->email,
        ];
    }

    // Relations
    public function staffProfile()
    {
        return $this->hasOne(StaffProfile::class);
    }

    public function notifications()
    {
        return $this->hasMany(UserNotification::class);
    }

    public function auditLogs()
    {
        return $this->hasMany(AuditLog::class);
    }

    // Helpers
    public function isAdmin(): bool
    {
        return $this->role === Role::Admin;
    }

    public function isProfesseur(): bool
    {
        return $this->role === Role::Professeur;
    }

    public function isEmploye(): bool
    {
        return $this->role === Role::Employe;
    }
}
