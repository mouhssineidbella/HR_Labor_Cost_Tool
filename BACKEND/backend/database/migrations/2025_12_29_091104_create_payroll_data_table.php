<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    
  public function up(): void
{
    Schema::create('payroll_data', function (Blueprint $table) {
        $table->id();
        $table->longText('row_data'); 
        $table->string('category')->nullable();
        $table->timestamps();
    });
}

   
    public function down(): void
    {
        Schema::dropIfExists('payroll_data');
    }
};
