# Classroom OS

Classroom OS is a mobile-first classroom management platform for teachers.

## Principles
- Mobile: simple, fast, and usable during class.
- Web: complete classroom and student management.
- Everything starts from a class session.
- Common tasks should take no more than three taps.

## MVP
Mobile: login, today timetable, live class, attendance, scores, homework, behavior, timeline.
Web: dashboard, students, teachers, classes, subjects, timetable, attendance, gradebook, reports, settings.

## Design
Figma: https://www.figma.com/design/QlleYC4QElren0VRwPAOed

## Local database quick start

Prerequisites: Node.js, pnpm, and Docker Desktop with Docker Compose.

```powershell
pnpm install
Copy-Item packages/database/.env.example packages/database/.env
pnpm db:up
pnpm db:migrate
pnpm db:migrate:status
pnpm db:test
```

The Compose service runs PostgreSQL 16 on `localhost:5432` with development-only credentials and a named volume. `pnpm db:up` waits for the database health check. Use `pnpm db:logs` to follow PostgreSQL logs and `pnpm db:down` to stop the service without deleting its data.

Local `.env` files are ignored. Never place production credentials in this repository.

To deliberately reset the disposable local database, first stop Compose and remove its volume, then recreate and migrate it:

```powershell
docker compose down --volumes
pnpm db:up
pnpm db:migrate
```

This reset is destructive and is never performed by the normal `db:down` script.

## Service foundation

`@classroom-os/database` exposes tenant-scoped application services for students, classrooms, timetables, sessions, attendance, and assessments. Every public method requires `schoolId`, validates API-facing input with Zod, returns serializable contracts from `@classroom-os/types`, and maps expected failures to stable domain error codes.

Mutation services write a sanitized `AuditLog` in the same transaction as the domain change. The web server derives `schoolId` and `actorUserId` from a validated database session and uses `trustedTenantInput` before calling those services; browser form bodies are never authoritative tenant or actor context.

## Authentication foundation

The web app has an accessible Thai email/password login at `/login`. Passwords use Argon2id, and authentication creates a random opaque cookie with `HttpOnly`, `SameSite=Lax`, and production-only `Secure` attributes. Only a SHA-256 hash of that token is stored in `AuthSession`; logout revokes the server-side row. Protected App Router pages validate the session and active school/user/teacher status on the server before rendering.

Roles are `SCHOOL_OWNER`, `ADMIN`, and `TEACHER`. Owner/admin access is school-scoped, while teachers require an exact term-classroom-subject `TeachingAssignment`. Authentication events record safe success, failure, and logout facts without passwords, raw emails, cookie tokens, or password hashes.

For explicit local-only synthetic accounts and multi-class authorization fixtures, run:

```powershell
pnpm db:bootstrap:auth
```

The command refuses production and non-local databases. Synthetic logins use `owner@synthetic.classroom.test`, `admin@synthetic.classroom.test`, and `teacher@synthetic.classroom.test`, with password `Classroom!Demo2026`. Never reuse these development-only credentials.

## Continuous integration

`.github/workflows/ci.yml` runs for pull requests and pushes to `main`. It provisions an ephemeral PostgreSQL 16 service, installs pnpm through Corepack, restores the pnpm store cache, applies committed migrations with `prisma migrate deploy`, and then runs database tests, lint, and build. CI uses synthetic data and a CI-only database password.
