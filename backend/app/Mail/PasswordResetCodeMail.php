<?php

namespace App\Mail;

use App\Models\PasswordResetCode;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordResetCodeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $code,
        public ?string $prenom = null,
    ) {}

    public function envelope(): Envelope
    {
        // Le code n'apparaît pas dans l'objet : il resterait lisible dans les
        // notifications d'un téléphone verrouillé ou dans un aperçu de messagerie.
        return new Envelope(
            subject: 'Réinitialisation de votre mot de passe — FST Mohammedia',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.password-reset-code',
            with: [
                'code'    => $this->code,
                'prenom'  => $this->prenom,
                'minutes' => PasswordResetCode::DUREE_MINUTES,
            ],
        );
    }
}
