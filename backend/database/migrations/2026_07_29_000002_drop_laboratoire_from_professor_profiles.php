<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Le rattachement d'un professeur à un laboratoire n'est plus suivi par
 * l'application : le champ n'apparaît nulle part et la colonne est retirée.
 *
 * Les unités organisationnelles de type LABORATOIRE restent gérables depuis
 * l'espace d'administration ; seul le lien avec le profil professeur disparaît.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('professor_profiles', function (Blueprint $table) {
            $table->dropConstrainedForeignId('laboratoire_id');
        });
    }

    public function down(): void
    {
        Schema::table('professor_profiles', function (Blueprint $table) {
            $table->foreignId('laboratoire_id')
                ->nullable()
                ->after('staff_profile_id')
                ->constrained('organizational_units')
                ->nullOnDelete();
        });
    }
};
