<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_types', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('nom_fr');
            $table->string('nom_ar')->nullable();
            $table->enum('allowed_role', ['TOUS', 'PROFESSEUR', 'EMPLOYE'])->default('TOUS');
            $table->boolean('requires_language')->default(false);
            $table->boolean('is_active')->default(true);
            $table->json('form_schema')->nullable();
            $table->timestamps();
        });

        Schema::create('document_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_type_id')->constrained()->cascadeOnDelete();
            $table->string('language', 2)->default('fr');
            $table->unsignedSmallInteger('version')->default(1);
            $table->longText('content');
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('requests', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();
            $table->foreignId('requester_id')->constrained('users');
            $table->foreignId('document_type_id')->constrained('document_types');
            $table->string('language', 2)->nullable();
            $table->enum('status', [
                'BROUILLON','EN_ATTENTE','EN_COURS',
                'VALIDEE','REJETEE','DOCUMENT_DISPONIBLE','ANNULEE'
            ])->default('BROUILLON');
            $table->json('payload')->nullable();
            $table->text('admin_comment')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('processing_started_at')->nullable();
            $table->timestamp('validated_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->foreignId('processed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::create('request_status_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('request_id')->constrained('requests')->cascadeOnDelete();
            $table->string('old_status')->nullable();
            $table->string('new_status');
            $table->text('comment')->nullable();
            $table->foreignId('changed_by')->constrained('users');
            $table->timestamps();
        });

        Schema::create('request_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('request_id')->constrained('requests')->cascadeOnDelete();
            $table->foreignId('template_id')->nullable()->constrained('document_templates')->nullOnDelete();
            $table->enum('type', ['PIECE_JOINTE', 'GENERE', 'SIGNE']);
            $table->string('original_name');
            $table->string('stored_name');
            $table->string('disk')->default('local');
            $table->string('path');
            $table->string('mime_type');
            $table->unsignedBigInteger('size');
            $table->string('sha256');
            $table->foreignId('uploaded_by')->constrained('users');
            $table->timestamps();
        });

        Schema::create('user_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type');
            $table->string('title');
            $table->text('message');
            $table->json('data')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action');
            $table->string('auditable_type')->nullable();
            $table->unsignedBigInteger('auditable_id')->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();

            $table->index(['auditable_type', 'auditable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('user_notifications');
        Schema::dropIfExists('request_files');
        Schema::dropIfExists('request_status_histories');
        Schema::dropIfExists('requests');
        Schema::dropIfExists('document_templates');
        Schema::dropIfExists('document_types');
    }
};
