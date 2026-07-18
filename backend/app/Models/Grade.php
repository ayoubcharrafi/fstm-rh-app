<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Grade extends Model
{
    protected $fillable = ['code', 'intitule_fr', 'intitule_ar', 'staff_type', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }
}
