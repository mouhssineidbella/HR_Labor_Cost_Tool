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

       
        return response()->json([
            'user' => $user,
            'token' => $token
        ], 200);
    }
}