<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Projection;
use App\Models\Plant;
class ProjectionController extends Controller
{
    // 1. GET: Jib ga3 s-Simulations (Scoped by plant)
    public function index(Request $request) {
        $user = $request->user();

        if ($user->role === 'admin') {
            return response()->json(Projection::all(), 200);
        }

        $plant = Plant::find($user->plant_id);
        if ($plant) {
            return response()->json(Projection::where('plant', $plant->name)->get(), 200);
        }

        return response()->json([], 200);
    }

    // 2. POST: Sajjél Simulations jdad (Push to Forecast)
    public function store(Request $request) {
        try {
            $request->validate(['data' => 'required|array']);
            foreach ($request->data as $item) {
                Projection::create([
                    'plant'      => $item['plant'],
                    'function'   => $item['function'],
                    'start_date' => $item['startDate'],
                    'base_salary'=> $item['baseSalary'],
                    'gross_salary'=> $item['grossSalary'],
                    'total_cost' => $item['totalCost'],
                    'count'      => 1
                ]);
            }
            return response()->json(['message' => 'Success'], 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    // 3. CLEAR: Msa7 ga3 Simulations (Reset Button)
    public function clear() {
        try {
            Projection::truncate(); // Msa7 koulchi
            return response()->json(['message' => 'Simulations Cleared!'], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    // 4. RESET: Delete all projections for current user's plant
    public function reset(Request $request) {
        try {
            $user = $request->user();
            if ($user->role === 'admin') {
                Projection::truncate();
            } else {
                $plant = Plant::find($user->plant_id);
                if ($plant) {
                    Projection::where('plant', $plant->name)->delete();
                }
            }
            return response()->json(['message' => 'Workspace Projections Cleared!'], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    // 4. DELETE: Msa7 we7da b we7da (ila 7tajitiha mn ba3d)
    public function destroy($id) {
        Projection::destroy($id);
        return response()->json(['message' => 'Deleted']);
    }
}