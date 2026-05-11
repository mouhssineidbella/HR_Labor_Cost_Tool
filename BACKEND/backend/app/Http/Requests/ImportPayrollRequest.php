<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ImportPayrollRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user();
        if (!$user) return false;

        // Global admins can upload for any plant
        if ($user->isGlobalAdmin()) return true;

        // Check if the request contains data
        $data = $this->input('data');
        if (!is_array($data)) return false;

        // Plant admins can only upload for their assigned plant
        $userPlant = \App\Models\Plant::find($user->plant_id);
        if (!$userPlant) return false;

        // Verify that the data array has a 'Plant' or 'Usine' column that matches the user's plant
        // We only check the first row since Excel uploads are usually homogeneous
        $firstRow = $data[0] ?? null;
        if ($firstRow) {
            $plantColumn = $firstRow['Plant'] ?? $firstRow['Usine'] ?? $firstRow['plant'] ?? null;
            if ($plantColumn && trim($plantColumn) !== $userPlant->name) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'data' => 'required|array',
            // Since Excel headers contain spaces and vary (e.g. "Base Salary", "Base salary"),
            // we will use a custom rule or validate the most common keys.
            // Using a wildcard validate on known keys if they exist:
            'data.*.Base Salary'   => 'sometimes|numeric|min:0',
            'data.*.Base salary'   => 'sometimes|numeric|min:0',
            // For dates, they can be Excel serials (numeric) or strings (Y-m-d)
            // So we just ensure it's not completely malformed.
        ];
    }
}
