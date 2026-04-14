<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Employee;
use App\Services\PayrollCalculatorService;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use PhpOffice\PhpSpreadsheet\Shared\Date; 
use Carbon\Carbon;
use App\Exports\EmployeesExport; 

class EmployeeController extends Controller
{
    protected $calculator;

    public function __construct(PayrollCalculatorService $calculator)
    {
        $this->calculator = $calculator;
    }

    public function uploadActual(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv',
        ]);

        $user = Auth::user(); 
        $plantId = ($user->role === 'admin') 
            ? $request->input('plant_id', 1) 
            : $user->plant_id;

        if (!$plantId) {
            return response()->json(['message' => 'Erreur: Aucune usine assignée.'], 403);
        }

        try {
            $file = $request->file('file');
            $data = Excel::toArray([], $file)[0];

            DB::beginTransaction();
            $count = 0; $updated = 0; $created = 0;

            foreach ($data as $index => $row) {
                if ($index == 0 || empty($row[0])) continue; 

                // 1. Safe Date Parsing (Avoids floor() error)
                $seniorityDate = $this->safeDate($row[5] ?? null);

                $inputForCalc = [
                    'seniority_date'   => $seniorityDate,
                    'cimr_rate'        => $this->cleanNumber($row[7] ?? 0),
                    'solde_conge'      => (int) $this->cleanNumber($row[8] ?? 0),
                    'base_salary'      => $this->cleanNumber($row[11] ?? 0),
                    'ot_25_hours'      => $this->cleanNumber($row[26] ?? 0),
                    'ot_50_hours'      => $this->cleanNumber($row[27] ?? 0),
                    'ot_100_hours'     => $this->cleanNumber($row[28] ?? 0),
                    'ot_holiday_hours' => $this->cleanNumber($row[29] ?? 0),
                    'night_shift_hours'=> $this->cleanNumber($row[35] ?? 0),
                ];

                // 2. Calculation
                $calculatedData = $this->calculator->calculateRow($inputForCalc);

                // 3. Save to Database
                $employee = Employee::updateOrCreate(
                    [
                        'matricule' => $row[0], 
                        'plant_id'  => $plantId 
                    ],
                    array_merge(
                        $calculatedData, 
                        [
                            'full_name'    => $row[1] ?? 'Inconnu',
                            'function'     => $row[3] ?? null,
                            'category'     => $row[2] ?? 'Direct',
                            'is_projected' => false,
                            'raw_data'     => json_encode($row) 
                        ],
                        $inputForCalc
                    )
                );

                if ($employee->wasRecentlyCreated) { $created++; } else { $updated++; }
                $count++;
            }

            DB::commit();
            return response()->json([
                'message' => "Import réussi! (Nouveaux: $created, Mis à jour: $updated)", 
                'count'   => $count
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Erreur: ' . $e->getMessage()], 500);
        }
    }

    public function index(Request $request)
    {
        $user = Auth::user();
        $query = Employee::query();

        if ($user->role === 'admin') {
            if ($request->filled('plant_id')) {
                $query->where('plant_id', $request->plant_id);
            }
        } else {
            $query->where('plant_id', $user->plant_id);
        }

        $employees = $query->get()->map(function($emp) {
            if (is_string($emp->raw_data)) {
                $emp->raw_data = json_decode($emp->raw_data, true);
            }
            return $emp;
        });

        return response()->json($employees);
    }

    public function getPlants()
    {
        if (Auth::user()->role !== 'admin') return response()->json([], 403);
        return response()->json(\App\Models\Plant::select('id', 'name')->get());
    }

    public function export() 
    {
        return Excel::download(new EmployeesExport, 'Payroll_Final_Calculated.xlsx');
    }

    // --- CLEANERS ---
    private function cleanNumber($value)
    {
        if (is_null($value) || $value === '') return 0;
        if (is_numeric($value)) return (float)$value;
        
        $cleaned = preg_replace('/[^0-9.]/', '', (string)$value);
        return is_numeric($cleaned) ? (float)$cleaned : 0;
    }

    private function safeDate($value)
    {
        if (!$value) return null;
        try {
          
            if (is_numeric($value)) {
                return Date::excelToDateTimeObject((float)$value);
            }
            return Carbon::parse($value);
        } catch (\Throwable $e) {
            return null;
        }
    }
}