<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PayrollSetting extends Model
{
    use HasFactory;

    protected $fillable = ['plant_id', 'key_name', 'value'];

    public function plant()
    {
        return $this->belongsTo(Plant::class);
    }
}
