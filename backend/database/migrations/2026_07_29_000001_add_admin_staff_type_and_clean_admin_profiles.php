<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Un compte administrateur était jusqu'ici enregistré comme un employé
 * (staff_type = 'EMPLOYE') faute de type dédié. Il héritait donc d'un
 * employee_profile porteur de données RH — solde de congé, ancienneté,
 * situation familiale — sans objet pour l'administration, et le rendu du
 * profil différait selon la manière dont le compte avait été créé.
 *
 * Cette migration introduit le type ADMIN et nettoie les profils existants.
 */
return new class extends Migration
{
    /** Champs du dossier RH vidés sur les profils administrateurs. */
    private const CHAMPS_RH = [
        'cin', 'doti', 'grade_id', 'organizational_unit_id',
        'situation_administrative', 'date_recrutement',
    ];

    public function up(): void
    {
        // doctrine/dbal n'est pas installé : l'enum se modifie en SQL brut.
        DB::statement(
            "ALTER TABLE staff_profiles
             MODIFY COLUMN staff_type ENUM('PROFESSEUR', 'EMPLOYE', 'ADMIN') NOT NULL"
        );

        // Le poste occupé reste une information utile pour un administrateur,
        // contrairement au reste du dossier RH. Il quitte employee_profiles
        // pour staff_profiles afin de survivre à la suppression du sous-profil.
        Schema::table('staff_profiles', function (Blueprint $table) {
            $table->string('fonction', 200)->nullable()->after('telephone');
        });

        $profilsAdmin = DB::table('staff_profiles')
            ->join('users', 'users.id', '=', 'staff_profiles.user_id')
            ->where('users.role', 'ADMIN')
            ->pluck('staff_profiles.id');

        if ($profilsAdmin->isEmpty()) {
            return;
        }

        // Report des fonctions avant que les sous-profils ne disparaissent.
        DB::table('employee_profiles')
            ->whereIn('staff_profile_id', $profilsAdmin)
            ->whereNotNull('fonction_actuelle')
            ->get(['staff_profile_id', 'fonction_actuelle'])
            ->each(fn ($ligne) => DB::table('staff_profiles')
                ->where('id', $ligne->staff_profile_id)
                ->update(['fonction' => $ligne->fonction_actuelle]));

        // Les sous-profils employé et professeur n'ont aucun sens pour un
        // administrateur : ils sont supprimés, pas seulement masqués.
        DB::table('employee_profiles')->whereIn('staff_profile_id', $profilsAdmin)->delete();
        DB::table('professor_profiles')->whereIn('staff_profile_id', $profilsAdmin)->delete();

        DB::table('staff_profiles')
            ->whereIn('id', $profilsAdmin)
            ->update(array_merge(
                ['staff_type' => 'ADMIN'],
                array_fill_keys(self::CHAMPS_RH, null),
            ));
    }

    public function down(): void
    {
        // Les profils ADMIN redeviennent des profils employé : c'est l'état
        // antérieur. Les données RH effacées ne sont pas restaurables.
        DB::table('staff_profiles')->where('staff_type', 'ADMIN')->update(['staff_type' => 'EMPLOYE']);

        Schema::table('staff_profiles', function (Blueprint $table) {
            $table->dropColumn('fonction');
        });

        DB::statement(
            "ALTER TABLE staff_profiles
             MODIFY COLUMN staff_type ENUM('PROFESSEUR', 'EMPLOYE') NOT NULL"
        );
    }
};
