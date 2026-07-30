<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Mise en file d'attente : le serveur SMTP demande une à trois secondes par
 * message. Une annonce diffusée à tous les agents ferait autrement expirer la
 * requête de l'administrateur, qui attendrait la fin des envois.
 *
 * Le code de réinitialisation, lui, reste synchrone : l'utilisateur l'attend à
 * l'écran, et un worker arrêté le priverait de sa réinitialisation.
 */
class NotificationMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /** Un serveur SMTP momentanément indisponible ne doit pas perdre l'e-mail. */
    public int $tries = 3;

    /** @var array<int, int> Attente croissante entre les tentatives, en secondes. */
    public array $backoff = [10, 60];

    public function __construct(
        public string $titre,
        public string $contenu,
        public ?string $prenom = null,
        public ?string $lien = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "{$this->titre} — FST Mohammedia",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.notification',
            with: [
                'titre'   => $this->titre,
                'contenu' => $this->contenu,
                'prenom'  => $this->prenom,
                'lien'    => $this->lien,
            ],
        );
    }
}
