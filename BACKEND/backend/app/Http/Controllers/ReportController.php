<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\PayrollData;
use App\Models\Projection;
use App\Models\Plant;
use App\Services\PayrollCalculatorService;

class ReportController extends Controller
{
    private PayrollCalculatorService $payrollService;

    public function __construct(PayrollCalculatorService $payrollService)
    {
        $this->payrollService = $payrollService;
    }

    /**
     * GET /api/reports/consolidated
     * 
     * Returns the full consolidated forecast report:
     * - Aggregated by Category (Direct, Indirect, Support, SGA)
     * - Broken down by GL Account (12 Yazaki budget lines)
     * - Spread across 12 monthly columns
     * - Includes both Actual HC and Projected employees
     * 
     * Query params:
     *   ?year=2026  (optional, defaults to current year)
     */
    public function consolidated(Request $request)
    {
        try {
            $user = $request->user();
            $year = $request->query('year') ? (int)$request->query('year') : null;

            // --- 1. FETCH ACTUAL HC DATA (scoped by plant) ---
            $plantName = $this->getPlantName($request);

            if ($user->isGlobalAdmin()) {
                $records = PayrollData::where('category', 'not like', 'Archived_%')->get();
            } else {
                $records = PayrollData::where('category', $plantName)->get();
            }

            // Decode JSON blobs into raw arrays
            $actualRows = $records->map(function ($item) {
                $row = is_string($item->row_data) 
                    ? json_decode($item->row_data, true) 
                    : $item->row_data;
                return is_array($row) ? $row : [];
            })->filter()->values()->toArray();

            // --- 2. FETCH PROJECTIONS (scoped by plant) ---
            if ($user->isGlobalAdmin()) {
                $projections = Projection::all()->toArray();
            } else {
                $projections = Projection::where('plant', $plantName)->get()->toArray();
            }

            // --- 3. BUILD CONSOLIDATED REPORT ---
            $report = $this->payrollService->buildConsolidatedReport(
                $actualRows,
                $projections,
                $year
            );

            // --- 4. ADD METADATA ---
            $report['metadata'] = [
                'plant'            => $plantName,
                'actual_count'     => count($actualRows),
                'projection_count' => count($projections),
                'generated_at'     => now()->toIso8601String(),
            ];

            return response()->json($report, 200);

        } catch (\Exception $e) {
            return response()->json([
                'error'   => 'Report generation failed',
                'message' => $e->getMessage(),
                'line'    => $e->getLine(),
            ], 500);
        }
    }

    /**
     * GET /api/reports/summary
     * 
     * Lightweight version: returns only the grand totals
     * and per-category annual totals (no monthly breakdown).
     * Useful for dashboard cards.
     */
    public function summary(Request $request)
    {
        try {
            $user = $request->user();
            $plantName = $this->getPlantName($request);

            if ($user->isGlobalAdmin()) {
                $records = PayrollData::where('category', 'not like', 'Archived_%')->get();
                $projections = Projection::all()->toArray();
            } else {
                $records = PayrollData::where('category', $plantName)->get();
                $projections = Projection::where('plant', $plantName)->get()->toArray();
            }

            $actualRows = $records->map(function ($item) {
                $row = is_string($item->row_data)
                    ? json_decode($item->row_data, true)
                    : $item->row_data;
                return is_array($row) ? $row : [];
            })->filter()->values()->toArray();

            $report = $this->payrollService->buildConsolidatedReport($actualRows, $projections);

            // Extract only summaries
            $categorySummaries = [];
            foreach ($report['categories'] as $cat) {
                $categorySummaries[] = [
                    'category'       => $cat['category'],
                    'total_headcount'=> max($cat['headcount']),
                    'annual_total'   => $cat['annual_total'],
                ];
            }

            return response()->json([
                'year'             => $report['year'],
                'plant'            => $plantName,
                'actual_count'     => count($actualRows),
                'projection_count' => count($projections),
                'categories'       => $categorySummaries,
                'grand_total'      => $report['grand_totals']['annual'],
                'monthly_totals'   => $report['grand_totals']['monthly'],
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'error'   => 'Summary generation failed',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Download the consolidated report as an Excel file using Maatwebsite
     */
    public function export(Request $request)
    {
        try {
            $user = $request->user();
            $year = $request->query('year') ? (int)$request->query('year') : null;
            $plantName = $this->getPlantName($request);

            if ($user->isGlobalAdmin()) {
                $records = PayrollData::where('category', 'not like', 'Archived_%')->get();
                $projections = Projection::all()->toArray();
            } else {
                $records = PayrollData::where('category', $plantName)->get();
                $projections = Projection::where('plant', $plantName)->get()->toArray();
            }

            $actualRows = $records->map(function ($item) {
                $row = is_string($item->row_data) ? json_decode($item->row_data, true) : $item->row_data;
                return is_array($row) ? $row : [];
            })->filter()->values()->toArray();

            $reportData = $this->payrollService->buildConsolidatedReport($actualRows, $projections, $year);

            // 2. We need to convert the structured report into a 2D array exactly as Forecast.jsx did
            $exportArray = [];
            $months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            // Row 1: Main Header
            $row1 = ['YAZAKI - HR LABOR COST REPORT'];
            foreach ($months as $m) $row1[] = '';
            $row1[] = ''; // Total
            $exportArray[] = $row1;

            // Row 2: Sub Header
            $row2 = [''];
            foreach ($months as $m) $row2[] = '';
            $row2[] = '';
            $exportArray[] = $row2;

            // Row 3: Column Headers
            $row3 = ['GL Account / Category'];
            foreach ($months as $m) $row3[] = $m;
            $row3[] = 'Total';
            $exportArray[] = $row3;

            // Data Rows
            foreach ($reportData['categories'] ?? [] as $catData) {
                // Category Header Row
                $maxHc = max($catData['headcount'] ?? [0]);
                $catRow = [$catData['category'] . ' (HC: ' . $maxHc . ')'];
                foreach ($months as $m) $catRow[] = '';
                $catRow[] = '';
                $exportArray[] = $catRow;

                // GL Accounts
                foreach ($catData['gl_accounts'] ?? [] as $glItem) {
                    $glRow = [$glItem['code'] . ' - ' . $glItem['label']];
                    foreach ($months as $idx => $m) {
                        $glRow[] = $glItem['monthly'][$idx] ?? 0;
                    }
                    $glRow[] = $glItem['total'] ?? 0;
                    $exportArray[] = $glRow;
                }
            }

            // Grand Totals
            $exportArray[] = [];
            $totalRow = ['GRAND TOTAL'];
            foreach ($months as $idx => $m) {
                $totalRow[] = $reportData['grand_totals']['monthly'][$idx] ?? 0;
            }
            $totalRow[] = $reportData['grand_totals']['annual'] ?? 0;
            $exportArray[] = $totalRow;

            return \Maatwebsite\Excel\Facades\Excel::download(
                new \App\Exports\ForecastExport($exportArray), 
                'Forecast_Consolidated.xlsx'
            );

        } catch (\Exception $e) {
            return response()->json(['error' => 'Export failed', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Helper: Get plant name for the current user
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
}
