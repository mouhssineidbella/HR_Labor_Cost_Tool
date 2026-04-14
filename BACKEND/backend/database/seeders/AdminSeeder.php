<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Compte Admin (Central HR)
        User::create([
            'name' => 'Super Admin',
            'email' => 'admin@gmail.com',
            'password' => Hash::make('password123'), 
            'role' => 'Central HR', 
            'plant' => 'All Plants', 
        ]);

        // 2. Compte Plant HR (Tanger)
        User::create([
            'name' => 'Manager Tanger',
            'email' => 'tanger@gmail.com',
            'password' => Hash::make('password123'),
            'role' => 'Plant HR', 
            'plant' => 'Tanger',  
        ]);

        // 3. Compte Plant HR (Kenitra)
        User::create([
            'name' => 'Manager Kenitra',
            'email' => 'kenitra@gmail.com',
            'password' => Hash::make('password123'),
            'role' => 'Plant HR',
            'plant' => 'Kenitra',
        ]);

        echo "✅ Comptes (Central HR & Plant HR) créés avec succès !";
    }
}