<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class StaffProfile extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id', 'staff_type', 'nom_fr', 'prenom_fr', 'nom_ar', 'prenom_ar',
        'sexe', 'date_naissance', 'lieu_naissance', 'cin', 'doti', 'telephone',
        'situation_administrative', 'date_recrutement', 'grade_id',
        'organizational_unit_id', 'photo_path',
    ];

    protected $appends = ['photo_url'];

    protected function casts(): array
    {
        return [
            'date_naissance'   => 'date:Y-m-d',
            'date_recrutement' => 'date:Y-m-d',
        ];
    }

    public function getPhotoUrlAttribute(): ?string
    {
        return $this->photo_path ? Storage::disk('public')->url($this->photo_path) : null;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function grade(): BelongsTo
    {
        return $this->belongsTo(Grade::class);
    }

    public function organizationalUnit(): BelongsTo
    {
        return $this->belongsTo(OrganizationalUnit::class);
    }

    public function professorProfile(): HasOne
    {
        return $this->hasOne(ProfessorProfile::class);
    }

    public function employeeProfile(): HasOne
    {
        return $this->hasOne(EmployeeProfile::class);
    }
}
