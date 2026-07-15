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
