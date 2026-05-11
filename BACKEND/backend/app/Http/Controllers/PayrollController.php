<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\PayrollData;
use App\Models\Projection;
use App\Models\User;
use App\Models\Plant;
use App\Services\PayrollCalculatorService;

class PayrollController extends Controller
{
    private PayrollCalculatorService $payrollService;

    public function __construct(PayrollCalculatorService $payrollService)
    {
        $this->payrollService = $payrollService;
    }

    /**
     * Helper: Get the plant name for the authenticated user.
     * Returns the actual plant name from DB for both roles.
     */
    private function getPlantName(Request $request): string
    {
        $user = $request->user();
        if ($user->plant_id) {
            $plant = Plant::find($user->plant_id);
            return $plant ? $plant->name : 'Unknown';
        }
        return 'Unknown';
    }

    // =========================================================================
    // 1. UPLOAD FILE (IMPORT) — With PayrollService Auto-Calculation
    // =========================================================================
    public function store(\App\Http\Requests\ImportPayrollRequest $request)
    {
        try {
            $user = $request->user();
            $data = $request->input('data');
            $plantName = $this->getPlantName($request);

            if (!$data || !is_array($data)) {
                return response()->json(['message' => 'Format invalide'], 400);
            }

            // ─────────────────────────────────────────────────
            // STEP 1: PRE-IMPORT CLEANUP (Plant-Scoped Delete)
            // ─────────────────────────────────────────────────
            // Delete ALL existing active records for this plant
            // so we never get duplicates (e.g. 8 instead of 4)
            PayrollData::where('category', $plantName)->delete();

            // Also clear this plant's projections (new import = fresh start)
            if ($user->isGlobalAdmin()) {
                Projection::truncate();
            } else {
                Projection::where('plant', $plantName)->delete();
            }

            // ─────────────────────────────────────────────────
            // STEP 2: CALCULATE EACH ROW VIA PayrollService
            // ─────────────────────────────────────────────────
            $activeEntries = [];
            $archiveEntries = [];
            $calculatedRows = [];
            $timestamp = now();

            foreach ($data as $rawRow) {
                if (!is_array($rawRow)) continue;

                // Run through centralized calculation engine
                $calculatedRow = $this->payrollService->calculateActualHC($rawRow);

                // Collect for frontend response
                $calculatedRows[] = $calculatedRow;

                // Active Data ("Ma Zone")
                $activeEntries[] = [
                    'row_data'   => json_encode($calculatedRow),
                    'category'   => $plantName,
                    'created_at' => $timestamp,
                    'updated_at' => $timestamp,
                ];

                // Archive Data (Historique)
                $archiveEntries[] = [
                    'row_data'   => json_encode($calculatedRow),
                    'category'   => 'Archived_' . $plantName,
                    'created_at' => $timestamp,
                    'updated_at' => $timestamp,
                ];
            }

            // ─────────────────────────────────────────────────
            // STEP 3: BULK INSERT (Active + Archive)
            // ─────────────────────────────────────────────────
            if (!empty($activeEntries)) {
                // Insert in chunks to avoid MySQL packet size limits
                foreach (array_chunk($activeEntries, 100) as $chunk) {
                    PayrollData::insert($chunk);
                }
            }

            if (!empty($archiveEntries)) {
                foreach (array_chunk($archiveEntries, 100) as $chunk) {
                    PayrollData::insert($chunk);
                }
            }

            // ─────────────────────────────────────────────────
            // STEP 4: RETURN CALCULATED DATA + COUNT
            // ─────────────────────────────────────────────────
            $count = count($calculatedRows);

            // Audit Trail: Log the action
            $targetPlant = \App\Models\Plant::where('name', $plantName)->first();
            \App\Models\ActivityLog::create([
                'user_id' => $user->id,
                'plant_id' => $targetPlant ? $targetPlant->id : $user->plant_id,
                'action_type' => 'Upload'
            ]);

            return response()->json([
                'message' => "✅ {$count} Actuals importés et calculés avec succès !",
                'count'   => $count,
                'data'    => $calculatedRows,
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur: ' . $e->getMessage(),
                'line'    => $e->getLine(),
            ], 500);
        }
    }

    // =========================================================================
    // 2. PREVIEW PROJECTION (For Real-time Simulation UI)
    // =========================================================================
    public function calculatePreview(Request $request)
    {
        try {
            $baseSalary = $request->input('base_salary');
            if (!is_numeric($baseSalary)) {
                return response()->json(['error' => 'base_salary is required'], 400);
            }

            $calculated = $this->payrollService->calculateProjection(['base_salary' => $baseSalary]);

            return response()->json($calculated, 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    // =========================================================================
    // 3. SAVE PROJECTIONS (FORECAST) — With PayrollService Auto-Calculation
    // =========================================================================
    public function saveProjections(\App\Http\Requests\SaveProjectionsRequest $request)
    {
        try {
            $user = $request->user();
            $data = $request->input('data');
            $plantName = $this->getPlantName($request);

            if (!$data || !is_array($data)) {
                return response()->json(['message' => 'Aucune donnée'], 400);
            }

            // Clean only this plant's projections
            if ($user->isGlobalAdmin()) {
                Projection::truncate();
            } else {
                Projection::where('plant', $plantName)->delete();
            }

            $projectionEntries = [];
            $archiveEntries = [];
            $timestamp = now();

            foreach ($data as $row) {
                if (!is_array($row)) continue;

                // Run through centralized calculation engine
                $calculated = $this->payrollService->calculateProjection($row);

                $projectionEntries[] = [
                    'plant'        => $plantName,
                    'function'     => $row['function'] ?? '',
                    'start_date'   => $row['start_date'] ?? null,
                    'base_salary'  => $row['base_salary'] ?? 0,
                    'gross_salary' => $calculated['gross_salary'],
                    'total_cost'   => $calculated['total_cost'],
                    'count'        => $row['count'] ?? 1,
                    'created_at'   => $timestamp,
                    'updated_at'   => $timestamp,
                ];

                $archiveEntries[] = [
                    'category'   => 'Archived_Forecast_' . $plantName,
                    'row_data'   => json_encode(array_merge($row, $calculated)),
                    'created_at' => $timestamp,
                    'updated_at' => $timestamp,
                ];
            }

            if (!empty($projectionEntries)) {
                Projection::insert($projectionEntries);
            }

            if (!empty($archiveEntries)) {
                PayrollData::insert($archiveEntries);
            }

            $count = count($projectionEntries);

            // Audit Trail: Log the action
            $targetPlant = \App\Models\Plant::where('name', $plantName)->first();
            \App\Models\ActivityLog::create([
                'user_id' => $user->id,
                'plant_id' => $targetPlant ? $targetPlant->id : $user->plant_id,
                'action_type' => 'Push'
            ]);

            return response()->json([
                'message' => "✅ {$count} Projections calculées et archivées !",
                'count'   => $count,
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
                'line'  => $e->getLine(),
            ], 500);
        }
    }

    // =========================================================================
    // 3. GET ARCHIVE (scoped by role)
    // =========================================================================
    public function getArchive(Request $request)
    {
        $user = $request->user();
        $query = PayrollData::where('category', 'like', 'Archived_%');

        // Plant Admin: only their plant's archives
        if ($user->isPlantAdmin()) {
            $plantName = $this->getPlantName($request);
            $query->where(function ($q) use ($plantName) {
                $q->where('category', 'Archived_' . $plantName)
                  ->orWhere('category', 'Archived_Forecast_' . $plantName);
            });
        }

        $data = $query->orderBy('created_at', 'desc')->get();

        $formatted = $data->map(function ($item) {
            $row = is_string($item->row_data) ? json_decode($item->row_data, true) : $item->row_data;
            if (is_array($row)) {
                foreach ($row as $key => $value) {
                    if (is_numeric($value) && !in_array(strtolower($key), ['id', 'finalid', 'matricule'])) {
                        $row[$key] = round((float)$value, 2);
                    }
                }
            }
            $item->row_data = $row;
            $item->category = str_replace('Archived_', '', $item->category);
            return $item;
        });

        return response()->json($formatted);
    }

    // =========================================================================
    // 4. GET ACTIVE DATA (scoped by role)
    // =========================================================================
    public function index(Request $request)
    {
        $user = $request->user();
        $plantName = $this->getPlantName($request);

        if ($user->isGlobalAdmin()) {
            // Global Admin: get all non-archived data
            $records = PayrollData::where('category', 'not like', 'Archived_%')->get();
        } else {
            // Plant Admin: only their plant
            $records = PayrollData::where('category', $plantName)->get();
        }

        $formatted = $records->map(function ($item) {
            $row = is_string($item->row_data) ? json_decode($item->row_data, true) : $item->row_data;
            if (is_array($row)) {
                foreach ($row as $key => $value) {
                    if (is_numeric($value) && !in_array(strtolower($key), ['id', 'finalid', 'matricule'])) {
                        $row[$key] = round((float)$value, 2);
                    }
                }
            }
            $row['Total_Labor_Cost'] = isset($row['Total_Labor_Cost']) ? round((float)$row['Total_Labor_Cost'], 2) : 0;
            return $row;
        });
        return response()->json($formatted);
    }

    // =========================================================================
    // 5. GET ARCHIVED PLANTS (scoped by role)
    // =========================================================================
    public function getArchivedPlants(Request $request)
    {
        $user = $request->user();

        if ($user->isPlantAdmin()) {
            // Plant Admin: only see their own plant
            $plantName = $this->getPlantName($request);
            return response()->json([$plantName]);
        }

        // Global Admin: see all archived plants
        $archived = PayrollData::where('category', 'like', 'Archived_%')->select('category')->distinct()->get()
            ->map(fn($item) => str_replace(['Archived_Forecast_', 'Archived_'], '', $item->category));

        $plantNames = Plant::pluck('name');

        return response()->json($archived->merge($plantNames)->unique()->values());
    }

    // =========================================================================
    // 6. DASHBOARD STATS
    // =========================================================================
    public function dashboardStats(Request $request)
    {
        // Placeholder — implement as needed
        return response()->json(['message' => 'OK']);
    }

    // =========================================================================
    // 7. RESET WORKSPACE (scoped by role)
    // =========================================================================
    public function resetWorkspace(Request $request)
    {
        try {
            $user = $request->user();

            if ($user->isGlobalAdmin()) {
                // Global Admin: reset everything
                Projection::truncate();
                PayrollData::where('category', 'not like', 'Archived_%')->delete();
                $logPlantId = null; // Global reset
            } else {
                // Plant Admin: reset only their plant
                $plantName = $this->getPlantName($request);
                Projection::where('plant', $plantName)->delete();
                PayrollData::where('category', $plantName)->delete();
                
                $targetPlant = \App\Models\Plant::where('name', $plantName)->first();
                $logPlantId = $targetPlant ? $targetPlant->id : $user->plant_id;
            }

            // Audit Trail: Log the action
            \App\Models\ActivityLog::create([
                'user_id' => $user->id,
                'plant_id' => $logPlantId,
                'action_type' => 'Reset'
            ]);

            return response()->json(['message' => 'Workspace Cleared!'], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
