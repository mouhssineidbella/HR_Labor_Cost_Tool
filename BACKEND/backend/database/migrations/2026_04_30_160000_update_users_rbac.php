<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add plant_id column (nullable FK to plants table)
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedBigInteger('plant_id')->nullable()->after('role');
        });

        // 2. Try to map existing string 'plant' values to plant_id
        $users = DB::table('users')->whereNotNull('plant')->get();
        foreach ($users as $user) {
            if ($user->plant && $user->plant !== 'All Plants') {
                $plant = DB::table('plants')->where('name', $user->plant)->first();
                if ($plant) {
                    DB::table('users')->where('id', $user->id)->update(['plant_id' => $plant->id]);
                }
            }
        }

        // 3. Update role values: "Central HR" -> "admin", "Plant HR" -> "plant_admin"
        DB::table('users')->where('role', 'Central HR')->update(['role' => 'admin']);
        DB::table('users')->where('role', 'Plant HR')->update(['role' => 'plant_admin']);

        // 4. Add FK constraint (after data migration)
        Schema::table('users', function (Blueprint $table) {
            $table->foreign('plant_id')->references('id')->on('plants')->onDelete('set null');
        });

        // 5. Drop the old 'plant' string column
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('plant');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('plant')->nullable()->after('role');
        });

        // Reverse: map plant_id back to plant name
        $users = DB::table('users')->whereNotNull('plant_id')->get();
        foreach ($users as $user) {
            $plant = DB::table('plants')->where('id', $user->plant_id)->first();
            if ($plant) {
                DB::table('users')->where('id', $user->id)->update(['plant' => $plant->name]);
            }
        }

        // Reverse role names
        DB::table('users')->where('role', 'admin')->update(['role' => 'Central HR', 'plant' => 'All Plants']);
        DB::table('users')->where('role', 'plant_admin')->update(['role' => 'Plant HR']);

        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['plant_id']);
            $table->dropColumn('plant_id');
        });
    }
};
