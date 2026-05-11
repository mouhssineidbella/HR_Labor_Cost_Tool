<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PayrollData extends Model
{
    use HasFactory;
    protected $table = 'payroll_data'; 
    
    protected $fillable = ['row_data', 'category'];

    protected $casts = ['row_data' => 'array']; 

    /**
     * The "booted" method of the model.
     */
    protected static function booted(): void
    {
        static::addGlobalScope(new \App\Models\Scopes\PlantScope);
    }
}