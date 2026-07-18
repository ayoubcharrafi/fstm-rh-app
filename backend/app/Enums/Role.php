<?php

namespace App\Enums;

enum Role: string
{
    case Admin      = 'ADMIN';
    case Professeur = 'PROFESSEUR';
    case Employe    = 'EMPLOYE';
}
