# Classroom OS Database

`@classroom-os/database` owns the PostgreSQL schema, migrations, generated Prisma Client, tenant-scoped repositories, and database integration tests for Classroom OS.

Only synthetic test data is used. The package contains no production connection configuration, permanent seed data, authentication implementation, or biometric models.

## Structure

```text
packages/database/
├── prisma/
│   ├── migrations/                    # Reviewed PostgreSQL migration history
│   └── schema.prisma                  # Tenant-aware classroom domain schema
├── src/
│   ├── repositories/
│   │   ├── classroom.repository.ts
│   │   ├── session.repository.ts
│   │   └── student.repository.ts
│   ├── client.ts                      # Lazy Prisma Client lifecycle helpers
│   ├── tenant.ts                      # Tenant scope validation and safe errors
│   ├── index.ts                       # Package exports
│   └── generated/prisma/              # Generated locally; ignored by Git
├── tests/
│   ├── helpers/                       # Synthetic factories and cleanup
│   └── integration/                   # Live PostgreSQL integration tests
├── .env.example
├── prisma.config.ts
└── vitest.config.ts
```

## Local setup

From the repository root:

```powershell
pnpm install
Copy-Item packages/database/.env.example packages/database/.env
pnpm db:up
pnpm db:migrate
pnpm db:migrate:status
```

The example URL is only for the local Docker service:

```text
DATABASE_URL="postgresql://classroom:classroom_dev_only@localhost:5432/classroom_os?schema=public"
```

Never commit `.env` or a real credential. Runtime errors and test output must not print the connection string.

## Database commands

| Command | Purpose |
| --- | --- |
| `pnpm db:up` | Start PostgreSQL and wait until its health check passes. |
| `pnpm db:down` | Stop Compose while preserving the named volume. |
| `pnpm db:logs` | Follow local PostgreSQL logs. |
| `pnpm db:format` | Format the Prisma schema without connecting. |
| `pnpm db:validate` | Validate the Prisma schema. |
| `pnpm db:generate` | Regenerate the ignored TypeScript Prisma Client. |
| `pnpm db:migrate -- --name <name>` | Create and apply a development migration. |
| `pnpm db:migrate:status` | Compare local migration history with the database. |
| `pnpm db:studio` | Open Prisma Studio against the configured local database. |
| `pnpm db:test` | Run synthetic integration tests against local PostgreSQL. |

## Migration workflow

1. Update `prisma/schema.prisma`.
2. Run `pnpm db:format`, `pnpm db:validate`, and `pnpm db:generate`.
3. Start the disposable database with `pnpm db:up`.
4. Create a named migration with `pnpm db:migrate -- --name <descriptive_name>`.
5. Review the generated SQL before commit. Confirm enum/table changes, native types and defaults, indexes, authoritative unique constraints, foreign-key actions, and the absence of destructive surprises.
6. Run `pnpm db:migrate:status` and `pnpm db:test`.

The initial migration is `init_classroom_core`. Its SQL uses PostgreSQL-native `gen_random_uuid()` defaults and preserves the unique constraints for enrollment, attendance, and scores.

Do not rewrite a migration after it is shared or applied outside a disposable environment. Create a follow-up migration instead.

## Tenant-safe runtime usage

The package does not construct a client at module import time. `getPrismaClient()` lazily creates one process-level client, preventing extra PostgreSQL pools during development hot reload. It fails clearly when `DATABASE_URL` is missing and never logs the URL.

Repository operations require `schoolId` explicitly:

```ts
import {
  getPrismaClient,
  listStudentsForSchool,
  requireClassSessionForSchool,
} from "@classroom-os/database";

const prisma = getPrismaClient();
const students = await listStudentsForSchool(prisma, { schoolId });
const session = await requireClassSessionForSchool(prisma, {
  schoolId,
  sessionId,
});
```

Repositories use tenant-scoped reads and mutations. Missing and cross-tenant records produce the same `TenantRecordNotFoundError`, preventing record-existence disclosure. Session creation derives teacher, classroom, subject, and term from a scoped timetable entry inside a transaction.

Direct Prisma access is still possible inside trusted server modules, so service code must continue to verify that every related record belongs to the active school. The raw database package must never be imported into browser or mobile bundles.

## Integration tests

Run:

```powershell
pnpm db:up
pnpm db:migrate:status
pnpm db:test
```

The safety guard refuses non-local hosts and any database name other than `classroom_os`. Factories create obviously synthetic schools, users, teachers, and students with unique identifiers. Every test deletes its own records in foreign-key-safe order; it never truncates unrelated data or relies on row order.

The suite verifies tenant isolation, enrollment/attendance/score uniqueness, timetable-to-session materialization, and cross-tenant session denial.

## Local data reset

`pnpm db:down` preserves the named volume. To intentionally remove all local database data:

```powershell
docker compose down --volumes
pnpm db:up
pnpm db:migrate
```

Volume removal is deliberately not part of any package script.

## Privacy scope

- No real student data or permanent seed records.
- No biometric or face-recognition data.
- No parent or student application models.
- No authentication implementation; `User` is persistence groundwork for later RBAC.
