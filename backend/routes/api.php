<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    DB::select('select 1');

    return response()->json([
        'app' => config('app.name'),
        'status' => 'ok',
        'database' => config('database.default'),
    ]);
});