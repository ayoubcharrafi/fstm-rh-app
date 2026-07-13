# Backend

Laravel API for FST RH App.

## Local Docker commands

```bash
docker compose exec backend php artisan migrate
docker compose exec backend php artisan test
```

## Main paths

- `routes/api.php`: API routes
- `app/Models`: Eloquent models
- `database/migrations`: database schema
- `database/seeders`: seed data

The database connection is MySQL and is configured through Docker Compose and `.env`.