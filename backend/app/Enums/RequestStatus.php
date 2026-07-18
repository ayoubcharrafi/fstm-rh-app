<?php

namespace App\Enums;

enum RequestStatus: string
{
    case Brouillon          = 'BROUILLON';
    case EnAttente          = 'EN_ATTENTE';
    case EnCours            = 'EN_COURS';
    case Validee            = 'VALIDEE';
    case Rejetee            = 'REJETEE';
    case DocumentDisponible = 'DOCUMENT_DISPONIBLE';
    case Annulee            = 'ANNULEE';

    /** Transitions autorisées par statut courant */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::Brouillon => [self::EnAttente, self::Annulee],
            self::EnAttente => [self::EnCours, self::Rejetee, self::Annulee],
            self::EnCours   => [self::Validee, self::Rejetee],
            self::Validee   => [self::DocumentDisponible],
            default         => [],
        };
    }

    public function canTransitionTo(self $next): bool
    {
        return in_array($next, $this->allowedTransitions(), true);
    }
}
