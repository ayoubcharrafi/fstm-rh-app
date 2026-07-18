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
}
