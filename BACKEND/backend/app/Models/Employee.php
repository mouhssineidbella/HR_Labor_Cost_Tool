<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
    use HasFactory;

    protected $fillable = [
        'matricule',
        'full_name',
        'category',
        'function',
        'seniority_date',
        'plant_id',
        'is_projected',
        
        // Inputs & Calculs
        'base_salary',
        'cimr_rate',
        'solde_conge',
        'ot_25_hours',
        'ot_50_hours',
        'ot_100_hours',
        'ot_holiday_hours',
        'night_shift_hours',
        
        'seniority_years',
        'seniority_allowance',
        'ot_total_amount',
        'gross_salary',
        'cnss_amount',
        'amo_amount',
        'cimr_amount',
        'at_amount',
        'holidays_accrual',
        'thirteenth_month',
        'eid_allowance',
        'total_company_cost',

        'raw_data' 
    ];

    protected $casts = [
        'raw_data' => 'array',
        'seniority_date' => 'date',
    ];
}