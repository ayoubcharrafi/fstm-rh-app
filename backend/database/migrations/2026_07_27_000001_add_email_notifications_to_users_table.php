<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Préférence d'envoi des notifications par e-mail.
     *
     * Activée par défaut : un agent qui n'a rien réglé doit être prévenu qu'un
     * document l'attend, sans quoi la notification passerait inaperçue jusqu'à
     * sa prochaine connexion.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('email_notifications')->default(true)->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('email_notifications');
        });
    }
};
