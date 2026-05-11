<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    // GET: List users (scoped by role)
    public function index(Request $request) {
        $user = $request->user();

        if ($user->isGlobalAdmin()) {
            // Global Admin sees all users
            return User::with('plant')->get()->map(function ($u) {
                return [
                    'id'         => $u->id,
                    'name'       => $u->name,
                    'email'      => $u->email,
                    'role'       => $u->role,
                    'role_label' => $u->role_label,
                    'plant_id'   => $u->plant_id,
                    'plant_name' => $u->plant ? $u->plant->name : 'N/A',
                ];
            });
        }

        // Plant Admin: should not access this endpoint (blocked by middleware),
        // but as a safety net, return 403
        return response()->json(['message' => 'Accès interdit.'], 403);
    }

    // POST: Create user (Global Admin only)
    public function store(Request $request) {
        $fields = $request->validate([
            'name'     => 'required',
            'email'    => 'required|email|unique:users',
            'password' => 'required|min:6',
            'role'     => 'required|in:admin,plant_admin',
            'plant_id' => 'nullable|exists:plants,id'
        ]);

        // Plant Admin MUST have a plant_id
        if ($fields['role'] === 'plant_admin' && empty($fields['plant_id'])) {
            return response()->json(['message' => 'Plant Admin doit avoir une usine assignée.'], 422);
        }

        // Global Admin has no plant
        if ($fields['role'] === 'admin') {
            $fields['plant_id'] = null;
        }

        $user = User::create([
            'name'     => $fields['name'],
            'email'    => $fields['email'],
            'password' => Hash::make($fields['password']),
            'role'     => $fields['role'],
            'plant_id' => $fields['plant_id'] ?? null
        ]);

        return response()->json($user, 201);
    }

    // DELETE: Remove user (Global Admin only, cannot self-delete)
    public function destroy(Request $request, $id) {
        $currentUser = $request->user();

        if ((int)$id === $currentUser->id) {
            return response()->json(['message' => 'Vous ne pouvez pas supprimer votre propre compte.'], 403);
        }

        User::destroy($id);
        return response()->json(['message' => 'Supprimé']);
    }
}