# Frontend

Next.js interface for FST RH App.

## Local Docker commands

```bash
docker compose up -d frontend
```

The application reads the backend URL from:

- `API_INTERNAL_URL` for server-side requests from Docker
- `NEXT_PUBLIC_API_URL` for browser-side requests