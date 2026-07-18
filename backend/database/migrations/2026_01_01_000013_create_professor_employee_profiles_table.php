<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('professor_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('laboratoire_id')->nullable()->constrained('organizational_units')->nullOnDelete();
            $table->date('date_prise_fonction')->nullable();
            $table->date('date_habilitation')->nullable();
            $table->string('specialite')->nullable();
            $table->timestamps();
        });

        Schema::create('employee_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('service_id')->nullable()->constrained('organizational_units')->nullOnDelete();
            $table->date('date_affectation')->nullable();
            $table->string('fonction_actuelle')->nullable();
            $table->string('situation_familiale')->nullable();
            $table->unsignedTinyInteger('nombre_enfants')->default(0);
            $table->string('anciennete')->nullable();
            $table->decimal('solde_conge', 5, 1)->default(0);
            $table->decimal('conge_reporte', 5, 1)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_profiles');
        Schema::dropIfExists('professor_profiles');
    }
};
