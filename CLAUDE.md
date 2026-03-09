# BeforeAfter.io

## Project Structure
- `frontend/` — Next.js 14+ (App Router, TypeScript, Tailwind, shadcn/ui)
- `backend/` — Go (Chi router, sqlc, pgx, golang-migrate)

## Development
```bash
make dev-db          # Start PostgreSQL
make dev-backend     # Start Go server on :3001
make dev-frontend    # Start Next.js on :3000
make sqlc            # Regenerate sqlc code
```

## Conventions
- Backend API prefix: `/api/`
- sqlc queries in `backend/db/queries/`
- Migrations in `backend/db/migrations/`
- Frontend route groups: `(auth)`, `(dashboard)`, `(marketing)`
- Use `pgtype.Text` for nullable string fields in sqlc
