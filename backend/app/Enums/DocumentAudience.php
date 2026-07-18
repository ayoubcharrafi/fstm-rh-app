<?php

namespace App\Enums;

enum DocumentAudience: string
{
    case Tous       = 'TOUS';
    case Professeur = 'PROFESSEUR';
    case Employe    = 'EMPLOYE';
}
