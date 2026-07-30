<?php

namespace App\Services;

use App\Mail\NotificationMail;
use App\Models\Setting;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class NotificationService
{
    /**
     * Réglage d'administration qui gouverne l'envoi d'un e-mail, par type.
     *
     * Tous les types de notification y figurent : c'est l'administration qui
     * décide lesquels justifient un e-mail, depuis l'onglet Notifications.
     * Un type absent de cette table ne donne jamais lieu à un e-mail.
     */
    private const TYPES_EMAIL = [
        'request.submitted'           => 'notifications.email.request_submitted',
        'request.processing'          => 'notifications.email.request_processing',
        'request.validated'           => 'notifications.email.request_validated',
        'request.rejected'            => 'notifications.email.request_rejected',
        'document.available'          => 'notifications.email.document_available',
        'admin.announcement'          => 'notifications.email.admin_announcement',
        'account.deletion_requested'  => 'notifications.email.account_deletion_requested',
        'account.deletion_rejected'   => 'notifications.email.account_deletion_rejected',
    ];

    /**
     * Types dont l'e-mail est actif tant que l'administration n'a rien réglé.
     *
     * Les étapes intermédiaires en sont absentes : recevoir un e-mail au dépôt
     * d'une demande, alors que l'agent vient de la déposer, n'apporte rien.
     */
    private const ACTIFS_PAR_DEFAUT = [
        'request.submitted',
        'request.validated',
        'request.rejected',
        'document.available',
        'admin.announcement',
        'account.deletion_requested',
        'account.deletion_rejected',
    ];

    /**
     * Chemin de l'interface où consulter la notification, par type.
     */
    private const LIENS = [
        'request.submitted'           => '/requests',
        'request.processing'          => '/requests',
        'request.validated'           => '/requests',
        'request.rejected'            => '/requests',
        'document.available'          => '/documents',
        'admin.announcement'          => '/notifications',
        // Destinée aux administrateurs : les demandes se traitent dans leurs paramètres.
        'account.deletion_requested'  => '/admin/settings',
        'account.deletion_rejected'   => '/settings',
    ];

    public function notify(User $user, string $type, string $title, string $message, array $data = []): void
    {
        UserNotification::create([
            'user_id' => $user->id,
            'type'    => $type,
            'title'   => $title,
            'message' => $message,
            'data'    => $data ?: null,
        ]);

        $this->envoyerEmail($user, $type, $title, $message);
    }

    public function notifyWithoutEmail(User $user, string $type, string $title, string $message, array $data = []): void
    {
        UserNotification::create([
            'user_id' => $user->id,
            'type'    => $type,
            'title'   => $title,
            'message' => $message,
            'data'    => $data ?: null,
        ]);
    }

    /**
     * Diffuse une notification à plusieurs destinataires en une seule requête.
     *
     * @param  iterable<User>  $users
     * @return int  Nombre de destinataires touchés.
     */
    public function broadcast(iterable $users, string $type, string $title, string $message, array $data = []): int
    {
        $now = now();
        $rows = [];
        $destinataires = [];

        foreach ($users as $user) {
            $rows[] = [
                'user_id'    => $user->id,
                'type'       => $type,
                'title'      => $title,
                'message'    => $message,
                'data'       => $data ? json_encode($data) : null,
                'read_at'    => null,
                'created_at' => $now,
                'updated_at' => $now,
            ];
            $destinataires[] = $user;
        }

        if ($rows) {
            UserNotification::insert($rows);
        }

        foreach ($destinataires as $user) {
            $this->envoyerEmail($user, $type, $title, $message);
        }

        return count($rows);
    }

    /**
     * NotificationMail étant en file d'attente, cet appel enregistre un job et
     * rend la main aussitôt : les erreurs SMTP surviennent plus tard, dans le
     * worker, qui réessaie puis journalise dans failed_jobs.
     *
     * Le catch couvre donc l'échec de mise en file (base indisponible). Comme
     * pour un échec d'envoi, l'action métier doit aboutir : la notification est
     * déjà enregistrée et reste visible dans la cloche du destinataire.
     */
    private function envoyerEmail(User $user, string $type, string $titre, string $message): void
    {
        if (! $this->emailActifPour($type) || ! $user->email_notifications) {
            return;
        }

        $lien = isset(self::LIENS[$type])
            ? rtrim(config('app.frontend_url'), '/') . self::LIENS[$type]
            : null;

        try {
            Mail::to($user->email)->send(new NotificationMail(
                $titre,
                $message,
                $user->staffProfile?->prenom_fr,
                $lien,
            ));
        } catch (\Throwable $e) {
            Log::warning('Notification e-mail non mise en file', [
                'user_id' => $user->id,
                'type'    => $type,
                'erreur'  => $e->getMessage(),
            ]);
        }
    }

    /**
     * Réglages de l'administration : interrupteur général, puis événement.
     *
     * Les deux priment sur la préférence de l'agent. Le premier permet de
     * réagir à une panne du serveur d'envoi sans toucher aux comptes un par un ;
     * le second de ne garder que les événements jugés utiles. Un type absent de
     * TYPES_EMAIL ne donne jamais lieu à un e-mail, quel que soit le réglage.
     */
    private function emailActifPour(string $type): bool
    {
        if (! Setting::get('notifications.email_enabled', true)) {
            return false;
        }

        $cle = self::TYPES_EMAIL[$type] ?? null;

        if ($cle === null) {
            return false;
        }

        return (bool) Setting::get($cle, in_array($type, self::ACTIFS_PAR_DEFAUT, true));
    }
}
