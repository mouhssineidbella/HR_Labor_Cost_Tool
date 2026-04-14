<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ProjectionController;
use App\Http\Controllers\PayrollController;
// SettingController removed

// 1. PUBLIC ROUTES
Route::post('/login', [AuthController::class, 'login']);

// --- PROJECTIONS & RESET ---
Route::get('/projections', [ProjectionController::class, 'index']);
Route::post('/projections', [ProjectionController::class, 'store']);
Route::post('/projections/clear', [ProjectionController::class, 'clear']);
Route::delete('/projections/{id}', [ProjectionController::class, 'destroy']);

// Reset Global
Route::post('/payroll/reset', [PayrollController::class, 'resetWorkspace']); 

// 2. PROTECTED ROUTES
Route::middleware('auth:sanctum')->group(function () {

    // --- USERS MANAGEMENT ---
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
    Route::delete('/users/{id}', [UserController::class, 'destroy']);

    // --- PAYROLL CORE SYSTEM ---
    Route::post('/payroll/upload', [PayrollController::class, 'store']); 
    Route::get('/payroll/list', [PayrollController::class, 'index']);   
    Route::get('/payroll/archive', [PayrollController::class, 'getArchive']); 
    Route::get('/payroll/archived-plants', [PayrollController::class, 'getArchivedPlants']);

    // --- FORECAST SAVING ---
    Route::post('/payroll/save-projections', [PayrollController::class, 'saveProjections']); 
    
    // --- DASHBOARD STATS (Consolidation) ---
    // Darouri n-zidoha hna ila makantch
    Route::get('/payroll/dashboard-stats', [PayrollController::class, 'dashboardStats']);

    // SETTINGS ROUTES REMOVED
});