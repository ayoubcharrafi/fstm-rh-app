# FST RH App

Application RH basee sur Laravel, Next.js et MySQL.

## Stack

- Backend: Laravel API, PHP 8.4
- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Database: MySQL 8.4
- Dev tools: Docker Compose, phpMyAdmin

## Services

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- Backend health: http://localhost:8000/api/health
- phpMyAdmin: http://localhost:8080
- MySQL local port: 3307

## Start

```bash
docker compose up -d --build
```

Run backend migrations:

```bash
docker compose exec backend php artisan migrate
```

Run backend tests:

```bash
docker compose exec backend php artisan test
```

## Structure

```text
backend/   Laravel API and database layer
frontend/  Next.js user interface
docker-compose.yml
```

## Database

The project is configured for MySQL. The default database is `fst_rh_db` with user `fst_user`.