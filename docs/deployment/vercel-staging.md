# Public Web/API staging preparation

Provider access is not assumed. If Vercel is selected, create a separate Preview/Staging project and do not connect Production data.

- Repository: the Classroom OS Git repository.
- Root directory: repository root (`C:\Users\phollee001\Documents\GitHub\classroom-os`).
- Install command: `corepack enable && corepack prepare pnpm@9.15.0 --activate && pnpm install --frozen-lockfile`.
- Build command: `pnpm build`.
- Node: 20.x (matches CI; pin the provider to Node 20).
- Environment: set `DATABASE_URL`, `CLASSROOM_OS_ENV=staging`, login limiter values, and any host-specific public URL in the Preview secret store.
- Build: `pnpm db:generate` must run before Next build; the workspace database build already generates Prisma Client.
- Migration: run `pnpm db:migrate:deploy` as a protected pre-deploy/release step against the staging database, not during every request.
- Health check: `GET /api/health` must return `{ "status": "ready", "database": "ready" }` with `Cache-Control: no-store`.

Verification: check HTTPS cookies, `/api/health`, `/login`, a synthetic login, assigned classrooms, and the golden path. Roll back by promoting the previous Preview deployment after confirming the migration is backward compatible. Do not run `prisma migrate dev`, do not expose development bootstrap routes, and do not rely on local filesystem uploads.
