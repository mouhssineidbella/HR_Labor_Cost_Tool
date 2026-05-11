<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Projection extends Model
{
    use HasFactory;
    
    protected $fillable = [
        'plant',
        'function',
        'start_date',
        'base_salary',
        'gross_salary',
        'total_cost',
        'count'
    ];

    /**
     * The "booted" method of the model.
     */
    protected static function booted(): void
    {
        static::addGlobalScope(new \App\Models\Scopes\PlantScope);
    }
}