<?php

namespace App\Providers;

use App\Services\DocumentGeneratorInterface;
use App\Services\DompdfDocumentGenerator;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(DocumentGeneratorInterface::class, DompdfDocumentGenerator::class);
    }

    public function boot(): void
    {
        //
    }
}
