<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserNotification;

class NotificationService
{
    public function notify(User $user, string $type, string $title, string $message, array $data = []): void
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
        }

        if ($rows) {
            UserNotification::insert($rows);
        }

        return count($rows);
    }
}
