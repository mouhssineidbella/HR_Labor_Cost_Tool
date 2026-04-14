<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\PayrollData;
use App\Models\Projection;
use App\Models\User;

class PayrollController extends Controller
{
    // 1. UPLOAD FILE (IMPORT)
    public function store(Request $request)
    {
        try {
            $user = $request->user();
            $data = $request->input('data');
            $plantName = $user->plant ?? 'All Plants';

            if (!$data || !is_array($data)) return response()->json(['message' => 'Format invalide'], 400);

            // Nettoyage
            PayrollData::where('category', $plantName)->delete();
            Projection::truncate();

            $activeEntries = [];
            $archiveEntries = [];
            $timestamp = now();

            foreach ($data as $row) {
                // Active Data ("Ma Zone")
                $activeEntries[] = [
                    'row_data' => json_encode($row),
                    'category' => $plantName,
                    'created_at' => $timestamp,
                    'updated_at' => $timestamp,
                ];

                // Archive Data (Historique)
                $archiveEntries[] = [
                    'row_data' => json_encode($row),
                    'category' => 'Archived_' . $plantName,
                    'created_at' => $timestamp,
                    'updated_at' => $timestamp,
                ];
            }

            PayrollData::insert($activeEntries);
            PayrollData::insert($archiveEntries);

            return response()->json(['message' => '✅ Fichier importé et Archivé !'], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Erreur: ' . $e->getMessage()], 500);
        }
    }

    public function saveProjections(Request $request)
    {
        try {
            $user = $request->user();
            $data = $request->input('data');
            $plantName = $user->plant ?? 'All Plants';

            if (!$data || !is_array($data)) return response()->json(['message' => 'Aucune donnée'], 400);

            // A. Nettoyer
            Projection::truncate();

            $projectionEntries = [];
            $archiveEntries = [];
            $timestamp = now();

            foreach ($data as $row) {
                // 1. Table PROJECTIONS (Safe Mode: N-3mrou koulchi)
                $projectionEntries[] = [
                    'plant' => $plantName,
                    'function' => $row['function'] ?? '',          // Eviter erreur si vide
                    'start_date' => $row['start_date'] ?? null,    // Eviter erreur si vide
                    'base_salary' => $row['base_salary'] ?? 0,     // Eviter erreur si vide
                    'row_data' => json_encode($row),               // N-sjjlou JSON hna ayden (Sécurité)
                    'created_at' => $timestamp,
                    'updated_at' => $timestamp,
                ];

                // ... west saveProjections ...

                // 2. Table ARCHIVE
                $archiveEntries[] = [
                    'category' => 'Archived_Forecast_' . $plantName,
                    'row_data' => json_encode($row),
                    'created_at' => $timestamp,
                    'updated_at' => $timestamp,
                ];
            }

            // B. Sauvegarder
            if (!empty($projectionEntries)) {
                Projection::insert($projectionEntries);
            }

            if (!empty($archiveEntries)) {
                PayrollData::insert($archiveEntries);
            }

            return response()->json(['message' => '✅ Forecast Validé et Archivé !']);
        } catch (\Exception $e) {
            // Hada ghadi y-affichiy l-erreur exacte f Console Network
            return response()->json(['error' => $e->getMessage(), 'line' => $e->getLine()], 500);
        }
    }

    // 3. GET ARCHIVE
    public function getArchive(Request $request)
    {
        $user = $request->user();
        $query = PayrollData::where('category', 'like', 'Archived_%');

        if ($user->role === 'Plant HR') {
            $query->where('category', 'Archived_' . $user->plant);
        }

        $data = $query->orderBy('created_at', 'desc')->get();

        $formatted = $data->map(function ($item) {
            $item->row_data = is_string($item->row_data) ? json_decode($item->row_data, true) : $item->row_data;
            $item->category = str_replace('Archived_', '', $item->category);
            return $item;
        });

        return response()->json($formatted);
    }

    // 4. GET ACTIVE DATA
    public function index(Request $request)
    {
        $user = $request->user();
        $records = PayrollData::where('category', $user->plant ?? 'All Plants')->get();

        $formatted = $records->map(function ($item) {
            $row = is_string($item->row_data) ? json_decode($item->row_data, true) : $item->row_data;
            $row['Total_Labor_Cost'] = isset($row['Total_Labor_Cost']) ? $row['Total_Labor_Cost'] : 0;
            return $row;
        });
        return response()->json($formatted);
    }

    // 5. GET ARCHIVED PLANTS
    public function getArchivedPlants(Request $request)
    {
        $archived = PayrollData::where('category', 'like', 'Archived_%')->select('category')->distinct()->get()
            ->map(fn($item) => str_replace('Archived_', '', $item->category));
        $userPlants = User::select('plant')->whereNotNull('plant')->where('plant', '!=', 'All Plants')->distinct()->pluck('plant');
        return response()->json($archived->merge($userPlants)->unique()->values());
    }

    // 6. RESET
    public function resetWorkspace()
    {
        try {
            Projection::truncate();
            PayrollData::where('category', 'not like', 'Archived_%')->delete();
            return response()->json(['message' => 'Workspace Cleared!'], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
