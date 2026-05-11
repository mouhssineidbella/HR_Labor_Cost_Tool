<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function index()
    {
        // Get all logs, ordered by newest first, with user and plant names
        $logs = \App\Models\ActivityLog::with(['user:id,name,role', 'plant:id,name'])
            ->latest()
            ->get();
            
        return response()->json($logs);
    }
}
