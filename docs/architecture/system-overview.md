# System Architecture

Classroom OS is a pnpm workspace orchestrated with Turborepo.

## Applications

- `apps/web`: Next.js and TypeScript web management experience.
- `apps/mobile`: planned Expo, React Native, and TypeScript classroom experience.

## Shared packages

- `packages/database`: PostgreSQL schema, Prisma configuration, generated client boundary, and database lifecycle helpers.
- `packages/types`: API-facing contracts and enum literals shared across application boundaries.
- `packages/ui`: shared design tokens.
- `packages/config`: placeholder for shared TypeScript and lint configuration.

## Database package

```text
packages/database/
├── prisma/migrations/
├── prisma/schema.prisma
├── src/repositories/
├── src/client.ts
├── src/tenant.ts
├── src/index.ts
├── tests/integration/
├── prisma.config.ts
├── tsconfig.json
└── .env.example
```

Prisma targets PostgreSQL and generates a TypeScript client into `packages/database/src/generated/prisma`. Generated code, build output, and local database credentials are excluded from Git. Runtime code creates the PostgreSQL driver adapter lazily so importing the package does not connect to a database or require environment variables during static module evaluation. Authentication code lives under `packages/database/src/auth`, alongside internal tenant repositories and public application services.

The root `docker-compose.yml` provisions the disposable PostgreSQL 16 development service with a persistent named volume and health check. It is local infrastructure only, not a production deployment definition.

The schema is organized around `School` as the tenant boundary. Operational tables carry `schoolId` for explicit service-layer scoping and tenant-first indexes. See [Data Model](./data-model.md) for entity responsibilities and lifecycle details.

## Request and data boundaries

App Router server components and server actions call `@classroom-os/database`; browser and mobile bundles never import its database runtime. Login verifies Argon2id password hashes, stores an opaque token hash in `AuthSession`, and sets the raw token only in an HttpOnly cookie. A protected server boundary resolves that session into `{ userId, schoolId, role, teacherId }` and revalidates account, school, and teacher status before rendering or mutation work.

The session context is the only trusted source for tenant and actor identity. `trustedTenantInput` replaces any client-provided `schoolId` or `actorUserId` before existing application services are invoked. The raw Prisma client, token hash, session row, password hash, and authentication-event principal hash never cross into client components.

## Security and privacy

The production posture requires tenant isolation, RBAC, audit logs, encryption, retention controls, least-privilege database credentials, and reviewed migrations. Current RBAC grants school owners and admins tenant-wide academic access; owner-only user/settings operations must explicitly call `requireRole(context, "SCHOOL_OWNER")`. Teachers must match a term, classroom, and subject teaching assignment. PostgreSQL row-level security should be evaluated as defense in depth before real tenant data is introduced.

Biometric and face-recognition storage is not part of the current data model. No real student data or production database URL belongs in the repository.

## Application service boundary

Server-side callers use six focused services: student, classroom, timetable, session, attendance, and assessment. Public service methods require `schoolId`, accept shared API contracts, validate with Zod, call only tenant-scoped repositories, and serialize Prisma dates and decimals into API-safe results. Prisma Client remains an internal persistence concern and must not cross the service boundary.

Services own workflow rules and transaction boundaries. Repositories own tenant-qualified persistence operations. Zod schemas own request shape and primitive validation. Stable domain errors own the future transport-neutral mapping to HTTP responses.

Mutation transactions also create an `AuditLog` with actor, action, entity, safe metadata, and timestamp. Audit metadata must never contain credentials, tokens, secrets, or biometric data.

Authentication uses a separate, narrowly shaped `AuthenticationEvent` because failed logins may not resolve to a school or user. It records event type, optional user/school, a one-way principal hash, a safe reason code, and time. Successful login, failed login, and logout are covered; passwords, raw email addresses, session tokens, and internal errors are excluded.

GitHub Actions validates this boundary against an ephemeral PostgreSQL 16 service. CI applies the committed migration history with `prisma migrate deploy`; it never creates development migrations or persists the service volume.
