<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function __construct(private AuditService $audit) {}

    public function index(Request $request): JsonResponse
    {
        $users = User::with('staffProfile')
            ->when($request->role, fn ($q) => $q->where('role', $request->role))
            ->when($request->search, fn ($q) => $q->where('email', 'like', "%{$request->search}%"))
            ->paginate(20);

        return response()->json($users);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['password'] = Hash::make($data['password']);

        $user = User::create($data);
        $this->audit->log('user.created', $user, [], $user->toArray(), $request);

        return response()->json($user, 201);
    }

    public function show(User $user): JsonResponse
    {
        return response()->json(
            $user->load('staffProfile.grade', 'staffProfile.organizationalUnit',
                        'staffProfile.professorProfile', 'staffProfile.employeeProfile')
        );
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $old = $user->toArray();
        $data = $request->validated();

        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        $user->update($data);
        $this->audit->log('user.updated', $user, $old, $user->fresh()->toArray(), $request);

        return response()->json($user->fresh());
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->audit->log('user.deleted', $user, $user->toArray(), [], $request);
        $user->delete();

        return response()->json(['message' => 'User deleted.']);
    }

    public function updateStatus(Request $request, User $user): JsonResponse
    {
        $request->validate(['is_active' => ['required', 'boolean']]);

        $old = ['is_active' => $user->is_active];
        $user->update(['is_active' => $request->is_active]);
        $this->audit->log('user.status_changed', $user, $old, ['is_active' => $user->is_active], $request);

        return response()->json($user->fresh());
    }

    // Profile endpoints (own profile)
    public function profile(Request $request): JsonResponse
    {
        return response()->json(
            $request->user()->load('staffProfile.grade', 'staffProfile.organizationalUnit',
                                   'staffProfile.professorProfile', 'staffProfile.employeeProfile')
        );
    }

    public function updateContact(Request $request): JsonResponse
    {
        $data = $request->validate([
            'telephone' => ['nullable', 'string', 'max:20'],
            'password'  => ['nullable', 'string', 'min:8', 'confirmed'],
        ]);

        $user = $request->user();

        if (isset($data['password'])) {
            $user->update(['password' => Hash::make($data['password'])]);
        }

        if ($user->staffProfile && isset($data['telephone'])) {
            $user->staffProfile->update(['telephone' => $data['telephone']]);
        }

        return response()->json($user->fresh()->load('staffProfile'));
    }
}
