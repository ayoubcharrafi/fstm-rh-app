<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('staff_type', ['PROFESSEUR', 'EMPLOYE']);
            $table->string('nom_fr');
            $table->string('prenom_fr');
            $table->string('nom_ar')->nullable();
            $table->string('prenom_ar')->nullable();
            $table->enum('sexe', ['M', 'F'])->nullable();
            $table->date('date_naissance')->nullable();
            $table->string('lieu_naissance')->nullable();
            $table->string('cin')->unique()->nullable();
            $table->string('doti')->unique()->nullable();
            $table->string('telephone')->nullable();
            $table->string('situation_administrative')->nullable();
            $table->date('date_recrutement')->nullable();
            $table->foreignId('grade_id')->nullable()->constrained('grades')->nullOnDelete();
            $table->foreignId('organizational_unit_id')->nullable()->constrained('organizational_units')->nullOnDelete();
            $table->string('photo_path')->nullable();
            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_profiles');
    }
};
