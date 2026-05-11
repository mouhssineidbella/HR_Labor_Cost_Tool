<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        // 1. Validation
        $fields = $request->validate([
            'email' => 'required|email',
            'password' => 'required'
        ]);

        // 2. Vérification Mot de passe
        if (!Auth::attempt($fields)) {
            return response()->json(['message' => 'Mot de passe incorrect'], 401);
        }

        $user = Auth::user();
        $token = $user->createToken('myapptoken')->plainTextToken;

        // Load plant relationship for any user with plant_id
        if ($user->plant_id) {
            $user->load('plant');
        }

        return response()->json([
            'user' => [
                'id'         => $user->id,
                'name'       => $user->name,
                'email'      => $user->email,
                'role'       => $user->role,
                'role_label' => $user->role_label,
                'plant_id'   => $user->plant_id,
                'plant_name' => $user->plant ? $user->plant->name : 'N/A',
            ],
            'token' => $token
        ], 200);
    }
}