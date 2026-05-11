<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SaveProjectionsRequest extends FormRequest
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

        // Plant admins can only push projections for their assigned plant
        // We use the plant name instead of plant_id because the frontend sends the plant name
        $userPlant = \App\Models\Plant::find($user->plant_id);
        if (!$userPlant) return false;

        foreach ($data as $row) {
            if (isset($row['plant']) && $row['plant'] !== $userPlant->name) {
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
            'data'               => 'required|array',
            'data.*.plant'       => 'required|string',
            'data.*.function'    => 'required|string',
            'data.*.base_salary' => 'required|numeric|min:0',
            'data.*.start_date'  => 'required|date',
            'data.*.count'       => 'nullable|integer|min:1',
        ];
    }
}
