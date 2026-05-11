<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PlantScopeMiddleware
{
    /**
     * Inject plant_id into request for downstream controllers.
     * Global Admin: plant_scope = null (access all)
     * Plant Admin: plant_scope = their plant_id (restricted)
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user) {
            $request->merge([
                'plant_scope' => $user->isGlobalAdmin() ? null : $user->plant_id,
            ]);
        }

        return $next($request);
    }
}
