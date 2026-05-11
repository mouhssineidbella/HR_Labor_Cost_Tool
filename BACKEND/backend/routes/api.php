<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ProjectionController;
use App\Http\Controllers\PayrollController;
use App\Http\Controllers\SettingController;

use App\Http\Controllers\ReportController;

// =============================================
// 1. PUBLIC ROUTES (No auth required)
// =============================================
Route::post('/login', [AuthController::class, 'login']);

// =============================================
// 2. PROTECTED ROUTES (Auth required)
// =============================================
Route::middleware(['auth:sanctum', 'plant.scope'])->group(function () {

    // --- SETTINGS (Configuration du Calcul) ---
    Route::get('/settings', [SettingController::class, 'index']);

    // --- PAYROLL CORE SYSTEM (All authenticated users) ---
    Route::post('/payroll/upload', [PayrollController::class, 'store']);
    Route::get('/payroll/list', [PayrollController::class, 'index']);
    Route::get('/payroll/archive', [PayrollController::class, 'getArchive']);
    Route::get('/payroll/archived-plants', [PayrollController::class, 'getArchivedPlants']);
    Route::post('/payroll/calculate-preview', [PayrollController::class, 'calculatePreview']);
    Route::post('/payroll/save-projections', [PayrollController::class, 'saveProjections']);
    Route::get('/payroll/dashboard-stats', [PayrollController::class, 'dashboardStats']);
    Route::post('/payroll/reset', [PayrollController::class, 'resetWorkspace']);

    // --- PROJECTIONS (All authenticated users) ---
    Route::get('/projections', [ProjectionController::class, 'index']);
    Route::post('/projections', [ProjectionController::class, 'store']);
    Route::post('/projections/clear', [ProjectionController::class, 'clear']);
    Route::delete('/projections/reset', [ProjectionController::class, 'reset']);
    Route::delete('/projections/{id}', [ProjectionController::class, 'destroy']);

    // --- REPORTS (Consolidated GL Reporting) ---
    Route::get('/reports/export', [ReportController::class, 'export']);
    Route::get('/reports/consolidated', [ReportController::class, 'consolidated']);
    Route::get('/reports/summary', [ReportController::class, 'summary']);

    // --- PLANTS LIST (For dropdown menus) ---
    Route::get('/plants', function () {
        return \App\Models\Plant::all();
    });

    // =============================================
    // 3. GLOBAL ADMIN ONLY ROUTES
    // =============================================
    Route::middleware('role:admin')->group(function () {
        // --- USER MANAGEMENT ---
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::delete('/users/{id}', [UserController::class, 'destroy']);
        
        // --- SETTINGS UPDATE (Global Admin Only) ---
        Route::post('/settings/update', [\App\Http\Controllers\SettingController::class, 'update']);
        
        // --- AUDIT TRAIL / HISTORY ---
        Route::get('/activity-logs', [\App\Http\Controllers\ActivityLogController::class, 'index']);
    });
});