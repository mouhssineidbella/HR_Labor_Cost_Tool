<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class PlantScope implements Scope
{
    /**
     * Apply the scope to a given Eloquent query builder.
     */
    public function apply(Builder $builder, Model $model): void
    {
        if (auth()->check() && !auth()->user()->isGlobalAdmin()) {
            $userPlantId = auth()->user()->plant_id;
            $userPlantName = \App\Models\Plant::find($userPlantId)->name ?? null;

            if ($userPlantName) {
                // Adapt based on the model's column
                if ($model instanceof \App\Models\Projection) {
                    $builder->where('plant', $userPlantName);
                } elseif ($model instanceof \App\Models\PayrollData) {
                    // PayrollData uses 'category' to store plant names, e.g., 'Kenitra' or 'Archived_Kenitra'
                    $builder->where('category', 'like', '%' . $userPlantName . '%');
                }
            } else {
                // If the user has no plant, they shouldn't see anything (unless they are a Global Admin)
                $builder->whereRaw('1 = 0');
            }
        }
    }
}
