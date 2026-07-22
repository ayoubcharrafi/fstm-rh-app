<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeProfile extends Model
{
    protected $fillable = [
        'staff_profile_id', 'service_id', 'date_affectation', 'fonction_actuelle',
        'situation_familiale', 'nombre_enfants', 'anciennete',
        'solde_conge', 'conge_reporte',
    ];

    protected function casts(): array
    {
        return [
            'date_affectation' => 'date:Y-m-d',
            'solde_conge'      => 'decimal:1',
            'conge_reporte'    => 'decimal:1',
        ];
    }

    public function staffProfile(): BelongsTo
    {
        return $this->belongsTo(StaffProfile::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(OrganizationalUnit::class, 'service_id');
    }
}
