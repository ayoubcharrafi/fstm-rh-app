<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\Setting;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'email'    => ['required', 'email', 'unique:users'],
            'password' => ['required', 'string', 'min:' . Setting::passwordMin()],
            'role'     => ['required', 'in:ADMIN,PROFESSEUR,EMPLOYE'],
        ];
    }
}
