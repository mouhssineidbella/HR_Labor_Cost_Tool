<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index() {
        return User::all();
    }

    public function store(Request $request) {
        $fields = $request->validate([
            'name' => 'required',
            'email' => 'required|email|unique:users',
            'password' => 'required',
            'role' => 'required', // Central HR or Plant HR
            'plant' => 'nullable' // Kenitra, Tanger...
        ]);

        $user = User::create([
            'name' => $fields['name'],
            'email' => $fields['email'],
            'password' => Hash::make($fields['password']), 
            'role' => $fields['role'],
            'plant' => $fields['plant']
        ]);

        return response()->json($user, 201);
    }

    // Supprimer user
    public function destroy($id) {
        User::destroy($id);
        return response()->json(['message' => 'Supprimé']);
    }
}