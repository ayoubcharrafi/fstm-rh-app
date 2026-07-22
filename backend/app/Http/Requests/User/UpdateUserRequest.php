<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\Setting;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $userId = $this->route('user')?->id;

        return [
            'email'    => ['sometimes', 'email', "unique:users,email,{$userId}"],
            'password' => ['nullable', 'string', 'min:' . Setting::passwordMin()],
            'role'     => ['sometimes', 'in:ADMIN,PROFESSEUR,EMPLOYE'],
            'is_active'=> ['sometimes', 'boolean'],
        ];
    }
}
