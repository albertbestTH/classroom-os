# Classroom OS Database

`@classroom-os/database` owns the PostgreSQL schema, migrations, generated Prisma Client, tenant-scoped repositories, and database integration tests for Classroom OS.

Only synthetic test data is used. The package contains no production connection configuration, permanent seed data, social authentication, password-reset flow, or biometric models.

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
| `pnpm db:bootstrap:auth` | Explicitly create local-only synthetic auth and multi-class fixtures. |
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

The second migration is `add_audit_log`. It adds the tenant-scoped audit table, optional actor foreign key, JSON metadata, and indexes for tenant/time and entity-history queries.

`add_authentication_foundation` adds account status, password hash and last-login fields, the owner role, revocable `AuthSession` rows, and sanitized `AuthenticationEvent` rows. Its data migration converts legacy inactive users to `DISABLED` before removing the old boolean. It also makes staff email globally unique for deterministic email/password login.

Do not rewrite a migration after it is shared or applied outside a disposable environment. Create a follow-up migration instead.

## Tenant-safe runtime usage

The package does not construct a client at module import time. Internally, a lazy process-level client prevents extra PostgreSQL pools during development hot reload. It fails clearly when `DATABASE_URL` is missing and never logs the URL.

Application code calls services with an explicit `schoolId`:

```ts
import {
  getClassSession,
  listStudents,
} from "@classroom-os/database";

const students = await listStudents({ schoolId });
const session = await getClassSession({ schoolId, sessionId });
```

Repositories use tenant-scoped reads and mutations. Missing and cross-tenant records produce the same `TenantRecordNotFoundError`, preventing record-existence disclosure. Session creation derives teacher, classroom, subject, and term from a scoped timetable entry inside a transaction.

The package root does not export Prisma Client or repositories. They remain internal persistence details used by services and database tests. The server-only database package must never be imported into browser or mobile bundles.

## Application services

Application code should call the service modules rather than repositories. Every public service method requires `schoolId`; mutations optionally accept `actorUserId`, validate with Zod, execute business changes and audit writes transactionally, and return API-facing contracts from `@classroom-os/types`.

Services enforce session transitions, completed-session immutability, active enrollment for attendance and scores, assessment maximums, and teacher/classroom timetable overlap. Expected failures use `NOT_FOUND`, `TENANT_ACCESS_DENIED`, `CONFLICT`, `VALIDATION_ERROR`, or `INVALID_STATE_TRANSITION`. Database error messages and connection information are never returned.

Audit metadata is deliberately narrow. Never place passwords, secrets, tokens, full request bodies, biometric data, or production credentials in `metadata`.

Account-management services are the exception to caller-supplied tenant scope: they accept a trusted authentication context and derive `schoolId` and actor internally. `listStaffUsers`, `createStaffAccount`, `setStaffAccountStatus`, `assignTeacherProfile`, `assignTeacherToClass`, and teaching-assignment queries enforce owner/admin/teacher boundaries before tenant-scoped repository work. Disabling an account updates its status and revokes active sessions transactionally.

Temporary passwords are required explicitly when creating staff, checked against the same Argon2id policy, hashed before persistence, and never returned or written to audit metadata. Admins can manage admin/teacher accounts but cannot create or modify an owner; teachers cannot manage staff.

Subject and academic-calendar services provide tenant-scoped catalog administration for the web console. Current year and term changes are transactional, audited, date-validated, and reinforced by the `enforce_current_academic_periods` partial unique indexes. Term dates must remain inside their parent academic year.

Teaching-assignment results include safe display labels for teacher, classroom, subject, term, and year. The database uniqueness constraint keeps exact duplicates out while allowing the same teacher and subject to remain distinct across multiple classrooms.

## Authentication and authorization

Passwords are hashed with Argon2id using the package's centralized policy. Password creation requires 12-128 characters, upper/lowercase letters, a number, a symbol, and rejection of common weak fragments. Plaintext passwords exist only for the duration of verification/hashing and are never logged or persisted.

`authenticateWithPassword` returns a server-only opaque token. The database stores only a SHA-256 token hash in `AuthSession`; `resolveServerSession` returns safe user data and trusted `{ userId, schoolId, role, teacherId }` context. `revokeServerSession` performs logout. Do not serialize these internal session results or import the database package into client components.

`SCHOOL_OWNER` and `ADMIN` bypass teaching-assignment checks only after exact school access is established. `TEACHER` access requires an active linked teacher profile and a matching `TeachingAssignment` for the term, classroom, and (when relevant) subject. Resource helpers load sessions/assessments inside the authenticated school before checking assignment, so missing and cross-school IDs do not disclose existence.

For local UI work only:

```powershell
pnpm db:bootstrap:auth
```

The script is idempotent, refuses `NODE_ENV=production`, refuses non-local hosts or databases other than `classroom_os`, and creates synthetic class A/B assignments plus an unassigned class C. Accounts are `owner@synthetic.classroom.test`, `admin@synthetic.classroom.test`, and `teacher@synthetic.classroom.test`; the synthetic-only password is `Classroom!Demo2026`. It never runs automatically in application startup or CI.

## Integration tests

Run:

```powershell
pnpm db:up
pnpm db:migrate:status
pnpm db:test
```

The safety guard refuses non-local hosts and any database name other than `classroom_os`. Factories create obviously synthetic schools, users, teachers, and students with unique identifiers. Every test deletes its own records in foreign-key-safe order; it never truncates unrelated data or relies on row order.

The suite verifies schema validation, tenant isolation, enrollment/attendance/score uniqueness, timetable-to-session materialization, session transitions, enrollment and score rules, teacher/classroom overlap detection, password hashing, disabled and invalid login behavior, revocable session context, multi-class assignment isolation, stable error codes, and audit creation.

From the repository root, `pnpm api:test` builds shared packages and runs route-handler tests against the same guarded local PostgreSQL database. Tests cover response/error mapping, unauthenticated access, CSRF-aware origin checks, malformed/oversized JSON, trusted tenant propagation, account roles, session revocation, and multi-class API isolation. CI runs both `pnpm db:test` and `pnpm api:test` on a disposable PostgreSQL service.

## CI database lifecycle

GitHub Actions starts a fresh PostgreSQL 16 service for each job and supplies a CI-only `DATABASE_URL`. CI runs `prisma migrate deploy` against that empty service, executes synthetic tests, then discards the service automatically. CI never runs `prisma migrate dev`, creates migration files, or touches the local named volume.

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
- No social login, password reset, parent/student identity, or biometric authentication.
