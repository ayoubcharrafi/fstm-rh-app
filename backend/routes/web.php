<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'app' => config('app.name'),
        'message' => 'FST RH API',
        'health' => url('/api/health'),
    ]);
});