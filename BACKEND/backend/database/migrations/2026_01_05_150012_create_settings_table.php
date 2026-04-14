<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB; // Darouri bach t-khdem DB::table

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique(); 
            $table->decimal('value', 10, 4); // Zdna f precision (10, 4) 7it AT rate sghir (0.0033)
            $table->timestamps();
        });

        // Initialisation des valeurs par défaut (Project Spec 3.2)
        DB::table('settings')->insert([
            [
                'key' => 'transport_fee', 
                'value' => 325.00, 
                'created_at' => now(), 'updated_at' => now()
            ],
            [
                'key' => 'panier_fee', 
                'value' => 300.00, 
                'created_at' => now(), 'updated_at' => now()
            ],
            [
                'key' => 'cimr_rate', 
                'value' => 0.06, 
                'created_at' => now(), 'updated_at' => now()
            ],
            [
                'key' => 'at_rate', 
                'value' => 0.0033, 
                'created_at' => now(), 'updated_at' => now()
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};