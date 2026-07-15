# Classroom OS Database

`@classroom-os/database` owns the PostgreSQL schema, generated Prisma Client, and server-only database client factory for Classroom OS.

The package is intentionally database-ready but not connected to any production environment. It contains no migrations or seed data yet.

## Structure

```text
packages/database/
├── prisma/
│   └── schema.prisma       # Tenant-aware classroom domain schema
├── src/
│   ├── client.ts           # Lazy Prisma Client lifecycle helpers
│   ├── index.ts            # Package exports
│   └── generated/prisma/   # Generated locally; ignored by Git
├── .env.example
├── package.json
├── prisma.config.ts
└── tsconfig.json
```

## Local setup

Install workspace dependencies from the repository root:

```bash
pnpm install
```

Prisma formatting, validation, and client generation do not connect to a database:

```bash
pnpm db:format
pnpm db:validate
pnpm db:generate
```

When a local PostgreSQL instance is available, copy `.env.example` to `.env` inside this package and replace the example credentials:

```text
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
```

Never commit `.env` or a real `DATABASE_URL`.

## Runtime usage

The package does not construct a client at module import time. Server code requests the process-level singleton only when database access is needed:

```ts
import { getPrismaClient } from "@classroom-os/database";

const prisma = getPrismaClient();
const classrooms = await prisma.classroom.findMany({
  where: { schoolId },
});
```

Call `disconnectPrisma()` during explicit worker or process shutdown when appropriate. Long-running application servers normally reuse the singleton.

## Migration workflow

`pnpm db:migrate` runs `prisma migrate dev` and therefore requires an explicitly configured development PostgreSQL database. It must not be pointed at production. No migration should be created until the team has a disposable local or shared development database and has reviewed the generated SQL.

`pnpm db:studio` likewise requires a configured database connection.

## Tenant isolation

Every tenant-owned model has a `schoolId` and indexes begin with that key for common access paths. Application services must:

- derive `schoolId` from trusted server-side authorization context, never request payloads;
- include `schoolId` in reads, updates, and deletes;
- verify that every related record belongs to the same school before a nested or transactional write;
- avoid exposing the unrestricted Prisma Client to browser code;
- add PostgreSQL row-level security as defense in depth before production data is introduced.

Foreign keys and compound uniqueness constraints protect entity integrity, but they do not replace tenant-scoped authorization.

## Privacy scope

- The repository contains no real student data and no seed records.
- Biometric and face-recognition data are explicitly out of scope.
- Parent and student application data models are not included in this foundation.
- Authentication behavior is not implemented; `User` only provides the persistence foundation for later RBAC work.
