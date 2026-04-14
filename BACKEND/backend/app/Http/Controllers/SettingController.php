<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    // Jib ga3 l-settings l l-Frontend
    public function index()
    {
        return response()->json(Setting::all());
    }

    // Update l-qima dyal chi setting m7dda
    public function update(Request $request)
    {
        $request->validate([
            'settings' => 'required|array',
        ]);

        foreach ($request->settings as $key => $value) {
            Setting::where('key', $key)->update(['value' => $value]);
        }

        return response()->json(['message' => 'Settings updated successfully']);
    }
}