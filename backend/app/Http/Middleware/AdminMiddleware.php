<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class AdminMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        if (! $request->user()?->isAdmin()) {
            return response()->json(['message' => 'Forbidden. Admin access required.'], 403);
        }

        return $next($request);
    }
}
