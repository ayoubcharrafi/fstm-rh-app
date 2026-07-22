<?php

namespace App\Providers;

use App\Services\DocumentGeneratorInterface;
use App\Services\DompdfDocumentGenerator;
use App\Models\Setting;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(DocumentGeneratorInterface::class, DompdfDocumentGenerator::class);
    }

    public function boot(): void
    {
        // Applique la durée de session JWT configurée en base (si la table existe déjà).
        try {
            if (Schema::hasTable('settings')) {
                $ttl = Setting::get('security.jwt_ttl_minutes');
                if ($ttl !== null) {
                    config(['jwt.ttl' => (int) $ttl]);
                }
            }
        } catch (\Throwable $e) {
            // Base indisponible (ex. pendant les migrations) : on garde la config par défaut.
        }
    }
}
