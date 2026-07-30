<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Codes de réinitialisation à 6 chiffres.
     *
     * Table distincte de password_reset_tokens (utilisée par le mécanisme natif
     * de Laravel) : on a besoin d'un compteur de tentatives, qu'un code court
     * rend indispensable pour empêcher le forçage.
     */
    public function up(): void
    {
        Schema::create('password_reset_codes', function (Blueprint $table) {
            $table->id();
            $table->string('email')->index();
            // Le code est stocké haché : une fuite de la base ne doit pas
            // permettre de réinitialiser les comptes.
            $table->string('code_hash');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->string('ip', 45)->nullable();
            $table->timestamps();

            $table->index(['email', 'used_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('password_reset_codes');
    }
};
