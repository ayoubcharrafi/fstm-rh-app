<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $userId = $this->route('user')?->id;

        return [
            'email'    => ['sometimes', 'email', "unique:users,email,{$userId}"],
            'password' => ['nullable', 'string', 'min:8'],
            'role'     => ['sometimes', 'in:ADMIN,PROFESSEUR,EMPLOYE'],
            'is_active'=> ['sometimes', 'boolean'],
        ];
    }
}
