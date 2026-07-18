<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfessorProfile extends Model
{
    protected $fillable = [
        'staff_profile_id', 'laboratoire_id',
        'date_prise_fonction', 'date_habilitation', 'specialite',
    ];

    protected function casts(): array
    {
        return [
            'date_prise_fonction' => 'date',
            'date_habilitation'   => 'date',
        ];
    }

    public function staffProfile(): BelongsTo
    {
        return $this->belongsTo(StaffProfile::class);
    }

    public function laboratoire(): BelongsTo
    {
        return $this->belongsTo(OrganizationalUnit::class, 'laboratoire_id');
    }
}
