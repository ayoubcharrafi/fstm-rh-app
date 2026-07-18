<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_templates', function (Blueprint $table) {
            // NULL = applicable à tous les rôles, sinon 'PROFESSEUR' ou 'EMPLOYE'
            $table->enum('role_target', ['PROFESSEUR', 'EMPLOYE'])->nullable()->after('language');
        });
    }

    public function down(): void
    {
        Schema::table('document_templates', function (Blueprint $table) {
            $table->dropColumn('role_target');
        });
    }
};
