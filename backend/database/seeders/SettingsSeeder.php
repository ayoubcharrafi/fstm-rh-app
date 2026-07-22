<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingsSeeder extends Seeder
{
    public function run(): void
    {
        // Valeurs par défaut = valeurs actuellement codées en dur dans l'application.
        $settings = [
            ['key' => 'requests.stale_threshold_hours', 'value' => '48',    'type' => 'int'],
            ['key' => 'security.login_max_attempts',    'value' => '5',     'type' => 'int'],
            ['key' => 'security.login_decay_seconds',   'value' => '60',    'type' => 'int'],
            ['key' => 'security.password_min_length',   'value' => '8',     'type' => 'int'],
            ['key' => 'security.jwt_ttl_minutes',       'value' => '60',    'type' => 'int'],
            ['key' => 'logs.audit_retention_days',      'value' => '0',     'type' => 'int'],
        ];

        foreach ($settings as $setting) {
            Setting::firstOrCreate(['key' => $setting['key']], $setting);
        }
    }
}
