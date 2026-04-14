<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            
           
            $table->string('matricule')->nullable();
            $table->json('raw_data')->nullable(); 
            $table->string('full_name')->nullable();
            $table->string('category')->default('Direct');
            $table->string('function')->nullable();
            $table->date('seniority_date')->nullable();
            $table->string('plant_id')->nullable();
            $table->boolean('is_projected')->default(false);

            $table->float('base_salary', 15, 2)->default(0);
            $table->float('cimr_rate', 8, 4)->default(0);
            $table->integer('solde_conge')->default(0);
            
            $table->float('ot_25_hours', 8, 2)->default(0);
            $table->float('ot_50_hours', 8, 2)->default(0);
            $table->float('ot_100_hours', 8, 2)->default(0);
            $table->float('ot_holiday_hours', 8, 2)->default(0);
            $table->float('night_shift_hours', 8, 2)->default(0);

            $table->float('transport_allowance', 15, 2)->default(0);
            $table->float('representation_allowance', 15, 2)->default(0);
            $table->float('panier_allowance', 15, 2)->default(0);
            $table->float('functional_allowance', 15, 2)->default(0);
            $table->float('aid_familial', 15, 2)->default(0);
            $table->float('transport_impo', 15, 2)->default(0);

            $table->float('seniority_years', 8, 2)->default(0);
            $table->float('seniority_allowance', 15, 2)->default(0);
            $table->float('ot_total_amount', 15, 2)->default(0);
            $table->float('gross_salary', 15, 2)->default(0);
            $table->float('cnss_amount', 15, 2)->default(0);
            $table->float('amo_amount', 15, 2)->default(0);
            $table->float('cimr_amount', 15, 2)->default(0);
            $table->float('at_amount', 15, 2)->default(0);
            $table->float('holidays_accrual', 15, 2)->default(0);
            $table->float('thirteenth_month', 15, 2)->default(0);
            $table->float('eid_allowance', 15, 2)->default(0);
            
            $table->float('total_company_cost', 15, 2)->default(0);

            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('employees');
    }
};