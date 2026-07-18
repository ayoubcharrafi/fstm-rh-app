<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DocumentType extends Model
{
    protected $fillable = [
        'code', 'nom_fr', 'nom_ar', 'allowed_role',
        'requires_language', 'is_active', 'form_schema',
    ];

    protected function casts(): array
    {
        return [
            'requires_language' => 'boolean',
            'is_active'         => 'boolean',
            'form_schema'       => 'array',
        ];
    }

    public function templates(): HasMany
    {
        return $this->hasMany(DocumentTemplate::class);
    }

    public function requests(): HasMany
    {
        return $this->hasMany(DocumentRequest::class);
    }
}
