<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Projection extends Model
{
    use HasFactory;
    
    // Had l-ligne hwa l-7ell: ila ma-kanch, Laravel kiy-bloki l-7fḍ (Error 500)
    protected $guarded = []; 
}