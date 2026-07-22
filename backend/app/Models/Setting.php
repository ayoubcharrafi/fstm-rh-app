<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $fillable = ['key', 'value', 'type'];

    private const CACHE_KEY = 'app_settings';

    /**
     * Toutes les valeurs typées, mises en cache (invalidées à chaque écriture).
     *
     * @return array<string, mixed>
     */
    public static function map(): array
    {
        return Cache::rememberForever(self::CACHE_KEY, function () {
            return self::all()->mapWithKeys(fn (Setting $s) => [
                $s->key => self::castValue($s->value, $s->type),
            ])->all();
        });
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        $map = self::map();
        return array_key_exists($key, $map) ? $map[$key] : $default;
    }

    public static function set(string $key, mixed $value, string $type = 'string'): void
    {
        self::updateOrCreate(
            ['key' => $key],
            ['value' => is_bool($value) ? ($value ? '1' : '0') : (string) $value, 'type' => $type]
        );
        Cache::forget(self::CACHE_KEY);
    }

    /** Longueur minimale de mot de passe, réutilisée sur tous les points de validation. */
    public static function passwordMin(): int
    {
        return (int) self::get('security.password_min_length', 8);
    }

    private static function castValue(?string $value, string $type): mixed
    {
        return match ($type) {
            'int'   => (int) $value,
            'bool'  => (bool) $value && $value !== '0',
            default => $value,
        };
    }

    protected static function booted(): void
    {
        static::saved(fn () => Cache::forget(self::CACHE_KEY));
        static::deleted(fn () => Cache::forget(self::CACHE_KEY));
    }
}
