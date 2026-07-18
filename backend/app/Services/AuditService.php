<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuditService
{
    public function log(
        string $action,
        ?object $auditable = null,
        array $oldValues = [],
        array $newValues = [],
        ?Request $request = null
    ): void {
        $req = $request ?? request();

        AuditLog::create([
            'user_id'        => Auth::id(),
            'action'         => $action,
            'auditable_type' => $auditable ? get_class($auditable) : null,
            'auditable_id'   => $auditable?->getKey(),
            'old_values'     => $oldValues ?: null,
            'new_values'     => $newValues ?: null,
            'ip_address'     => $req->ip(),
            'user_agent'     => $req->userAgent(),
        ]);
    }
}
