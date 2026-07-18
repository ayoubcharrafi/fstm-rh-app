<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organizational_units', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('nom_fr');
            $table->string('nom_ar')->nullable();
            $table->enum('type', ['DEPARTEMENT', 'SERVICE', 'LABORATOIRE']);
            $table->foreignId('parent_id')->nullable()->constrained('organizational_units')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organizational_units');
    }
};
