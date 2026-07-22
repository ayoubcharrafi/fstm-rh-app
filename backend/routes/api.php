<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\DocumentTypeController;
use App\Http\Controllers\Api\DocumentTemplateController;
use App\Http\Controllers\Api\GradeController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OrganizationalUnitController;
use App\Http\Controllers\Api\RequestController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\StaffProfileController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

// Health check
Route::get('/health', function () {
    DB::select('select 1');
    return response()->json(['app' => config('app.name'), 'status' => 'ok']);
});

Route::prefix('v1')->group(function () {

    // ---------- Auth (public) ----------
    Route::prefix('auth')->group(function () {
        Route::post('login', [AuthController::class, 'login']);
        Route::post('forgot-password', [AuthController::class, 'forgotPassword']);
        Route::post('reset-password', [AuthController::class, 'resetPassword']);
    });

    // ---------- Authenticated ----------
    Route::middleware('auth:api')->group(function () {

        // Auth
        Route::prefix('auth')->group(function () {
            Route::post('refresh', [AuthController::class, 'refresh']);
            Route::post('logout', [AuthController::class, 'logout']);
            Route::get('me', [AuthController::class, 'me']);
        });

        // Own profile
        Route::get('profile', [UserController::class, 'profile']);
        Route::post('profile', [UserController::class, 'storeProfile']);
        Route::patch('profile', [UserController::class, 'updateProfile']);
        Route::post('profile/photo', [UserController::class, 'uploadPhoto']);
        Route::delete('profile/photo', [UserController::class, 'deletePhoto']);
        Route::patch('profile/contact', [UserController::class, 'updateContact']);

        // Mon compte
        Route::post('account/password', [AccountController::class, 'changePassword']);

        // Referentials (read-only for all authenticated)
        Route::get('grades', [GradeController::class, 'index']);
        Route::get('organizational-units', [OrganizationalUnitController::class, 'index']);
        Route::get('document-types', [DocumentTypeController::class, 'index']);

        // Requests
        Route::get('requests', [RequestController::class, 'index']);
        Route::post('requests', [RequestController::class, 'store']);
        Route::get('requests/{documentRequest}', [RequestController::class, 'show']);
        Route::patch('requests/{documentRequest}', [RequestController::class, 'update']);
        Route::post('requests/{documentRequest}/submit', [RequestController::class, 'submit']);
        Route::post('requests/{documentRequest}/cancel', [RequestController::class, 'cancel']);

        // Documents
        Route::get('requests/{documentRequest}/documents', [DocumentController::class, 'index']);
        Route::get('documents/{document}/download', [DocumentController::class, 'download']);
        Route::post('requests/{documentRequest}/attachments', [DocumentController::class, 'uploadAttachment']);
        Route::delete('requests/{documentRequest}/attachments/{attachment}', [DocumentController::class, 'deleteAttachment']);

        // Notifications
        Route::get('notifications', [NotificationController::class, 'index']);
        Route::post('notifications/{notification}/read', [NotificationController::class, 'markRead']);
        Route::post('notifications/read-all', [NotificationController::class, 'markAllRead']);

        // Dashboard
        Route::get('dashboard/user', [DashboardController::class, 'user']);

        // ---------- Admin only ----------
        Route::middleware('admin')->prefix('admin')->group(function () {

            // Users
            Route::get('users', [UserController::class, 'index']);
            Route::post('users', [UserController::class, 'store']);
            Route::get('users/{user}', [UserController::class, 'show']);
            Route::patch('users/{user}', [UserController::class, 'update']);
            Route::delete('users/{user}', [UserController::class, 'destroy']);
            Route::patch('users/{user}/status', [UserController::class, 'updateStatus']);

            // Staff profiles
            Route::post('users/{user}/profile', [StaffProfileController::class, 'store']);
            Route::patch('users/{user}/profile', [StaffProfileController::class, 'update']);

            // Referential management
            Route::post('grades', [GradeController::class, 'store']);
            Route::patch('grades/{grade}', [GradeController::class, 'update']);
            Route::delete('grades/{grade}', [GradeController::class, 'destroy']);

            Route::post('organizational-units', [OrganizationalUnitController::class, 'store']);
            Route::patch('organizational-units/{organizationalUnit}', [OrganizationalUnitController::class, 'update']);
            Route::delete('organizational-units/{organizationalUnit}', [OrganizationalUnitController::class, 'destroy']);

            // Request management
            Route::post('requests/{documentRequest}/start-processing', [RequestController::class, 'startProcessing']);
            Route::post('requests/{documentRequest}/validate', [RequestController::class, 'validate']);
            Route::post('requests/{documentRequest}/reject', [RequestController::class, 'reject']);
            Route::post('requests/{documentRequest}/generate-document', [DocumentController::class, 'generateDocument']);
            Route::post('requests/{documentRequest}/upload-signed-document', [DocumentController::class, 'uploadSigned']);

            // Document types management
            Route::post('document-types', [DocumentTypeController::class, 'store']);
            Route::patch('document-types/{documentType}', [DocumentTypeController::class, 'update']);
            Route::delete('document-types/{documentType}', [DocumentTypeController::class, 'destroy']);

            // Templates
            Route::get('templates', [DocumentTemplateController::class, 'index']);
            Route::post('templates', [DocumentTemplateController::class, 'store']);
            Route::get('templates/{template}', [DocumentTemplateController::class, 'show']);
            Route::patch('templates/{template}', [DocumentTemplateController::class, 'update']);
            Route::delete('templates/{template}', [DocumentTemplateController::class, 'destroy']);
            Route::get('templates/{template}/preview', [DocumentTemplateController::class, 'preview']);

            // Dashboard & audit
            Route::get('dashboard', [DashboardController::class, 'admin']);
            Route::get('audit-logs', [DashboardController::class, 'auditLogs']);
            Route::get('audit-logs/export', [DashboardController::class, 'auditExport']);
            Route::delete('audit-logs', [DashboardController::class, 'auditPurge']);

            // Paramètres plateforme
            Route::get('settings', [SettingController::class, 'index']);
            Route::put('settings', [SettingController::class, 'update']);
            Route::delete('settings/read-notifications', [SettingController::class, 'purgeReadNotifications']);

            // Notifications (diffusion & statistiques)
            Route::get('notifications/stats', [NotificationController::class, 'adminStats']);
            Route::post('notifications/broadcast', [NotificationController::class, 'broadcast']);
        });
    });
});
