<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('projections', function (Blueprint $table) {
    $table->id();
    $table->string('plant');
    $table->string('function');
    $table->date('start_date');
    $table->decimal('base_salary', 15, 2);
    $table->decimal('gross_salary', 15, 2);
    $table->decimal('total_cost', 15, 2);
    $table->integer('count')->default(1);
    $table->timestamps();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('projections');
    }
};
