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

Authenticated route handlers share one adapter that resolves the request cookie, maps stable domain/auth errors, applies `no-store`, and returns a consistent response envelope. Mutation handlers additionally enforce same-origin requests, JSON content type, and a 64 KiB body limit. Each resource handler performs its own role and assignment authorization; proxy middleware is not an authorization dependency.

## Security and privacy

The production posture requires tenant isolation, RBAC, audit logs, encryption, retention controls, least-privilege database credentials, and reviewed migrations. Current RBAC grants school owners and admins tenant-wide academic access; owner-only user/settings operations must explicitly call `requireRole(context, "SCHOOL_OWNER")`. Teachers must match a term, classroom, and subject teaching assignment. PostgreSQL row-level security should be evaluated as defense in depth before real tenant data is introduced.

Biometric and face-recognition storage is not part of the current data model. No real student data or production database URL belongs in the repository.

## Application service boundary

Server-side callers use six focused services: student, classroom, timetable, session, attendance, and assessment. Public service methods require `schoolId`, accept shared API contracts, validate with Zod, call only tenant-scoped repositories, and serialize Prisma dates and decimals into API-safe results. Prisma Client remains an internal persistence concern and must not cross the service boundary.

Services own workflow rules and transaction boundaries. Repositories own tenant-qualified persistence operations. Zod schemas own request shape and primitive validation. Stable domain errors own the future transport-neutral mapping to HTTP responses.

Mutation transactions also create an `AuditLog` with actor, action, entity, safe metadata, and timestamp. Audit metadata must never contain credentials, tokens, secrets, or biometric data.

Authentication uses a separate, narrowly shaped `AuthenticationEvent` because failed logins may not resolve to a school or user. It records event type, optional user/school, a one-way principal hash, a safe reason code, and time. Successful login, failed login, and logout are covered; passwords, raw email addresses, session tokens, and internal errors are excluded.

The login limiter is a lazy per-process map keyed by a SHA-256 digest of normalized email and client IP. It never stores or logs the password. Its limit and window come from environment values with safe defaults. A distributed deployment must replace this implementation with an atomic shared store such as Redis; forwarded IP headers are trusted only behind a configured proxy.

Account management remains an application-service concern. Owner/admin services call tenant-scoped repositories, enforce the owner-only boundary, hash explicit temporary passwords, revoke sessions when disabling an account, and audit safe identifiers/status/role changes. Teacher profiles and assignments are linked through authoritative school-owned records.

## Admin console boundary

The web admin console uses server components for authenticated initial reads and small client islands for search, filters, forms, status confirmation, and assignment selection. The `(admin)` route group revalidates an owner/admin session before rendering `/staff`, `/subjects`, `/academic-years`, or `/terms`; `/classrooms` branches by trusted role so managers receive mutation controls while teachers receive only their assignment-scoped class list.

Sidebar items come from a pure role-to-navigation mapping. This improves discoverability but is not a security boundary. Page render functions and route handlers independently enforce roles, tenant scope, and exact teaching assignments.

## Role-specific workspaces

The authenticated `/` route is server-rendered from the resolved role. A teacher lands in the Teacher Workspace and sees only personal teaching navigation and metrics; an owner or admin lands in School Administration and sees an explicitly school-wide dashboard. There is no role switch in browser state. The `(teacher)` and `(admin)` App Router groups provide server-side layout guards for role-exclusive pages while shared operational routes continue to authorize each request from the session.

Teacher navigation contains personal overview, assigned classes, timetable, Live Class, attendance, gradebook, personal reports, documents, and profile. School Administration contains students, staff, school classrooms and subjects, academic calendar, timetable, attendance, gradebook, reports, import placeholder, and documents; settings are owner-only. Staff pages and handlers require owner/admin authorization even if opened directly.

`TeachingContext` is the reusable authorization/display tuple `{ academicYearId, termId, teachingAssignmentId, teacherId, classroomId, subjectId }`. The dashboard service creates these tuples from current-term teaching assignments. For teachers, the trusted session supplies `teacherId` and only their contexts are returned. For managers, teacher/classroom/subject selections must match at least one same-school assignment; invalid mixed combinations are rejected rather than broadened.

`subject.service` and `academic-calendar.service` extend the application boundary. Their repositories contain every Prisma query and always qualify records by `schoolId`. Mutations write sanitized audit records in the same transaction. Current academic periods are switched transactionally and backed by PostgreSQL partial unique indexes to prevent concurrent writers from creating multiple current years or terms.

Assignment results include display-safe teacher, classroom, subject, term, and academic-year labels. These labels preserve the complete assignment identity in the UI: the same subject taught in classrooms A and B appears as two rows and never becomes a combined class scope.

GitHub Actions validates this boundary against an ephemeral PostgreSQL 16 service. CI applies the committed migration history with `prisma migrate deploy`; it never creates development migrations or persists the service volume.

## Operational classroom boundary

Timetable and session rows now store `teachingAssignmentId` in addition to their denormalized term, teacher, classroom, and subject snapshot. Server components query the application services with the trusted session context; focused client islands call authenticated route handlers for create/edit, materialize, start/end, and attendance actions. A teacher's query is always constrained by `teacherId`, while managers may request school-wide views and apply explicit filters.

School-local dates are calculated with `Intl` and `School.timezone`, then converted to UTC instants for persistence. Materialization accepts a local `YYYY-MM-DD`, verifies the timetable weekday and term boundary, derives start/end instants from the entry's wall-clock times, and relies on `(timetableEntryId, scheduledStart)` uniqueness to reject a duplicate daily session.

`TimetableCoverage` adds a dated, audited approval boundary for cover and swap requests. It never rewrites the original `TimetableEntry`, `TeachingAssignment`, or class ownership. Once accepted, the substitute receives access only to the covered entry/session on that school-local date; a swap grants the reciprocal dated access as well. Acceptance checks regular timetable and approved-coverage overlaps. Today views replace covered-away entries with the effective entry, while attendance and scores continue to use the original classroom, subject, enrollment, and assignment IDs.

The web gradebook and mobile quick-score screen read and mutate the same assessment/score services. Missing scores serialize as `null`, while an earned zero remains numeric zero. Mobile query persistence is a presentation cache, not a second source of truth: only today/timetable/assignment/coverage reads are stored for up to 12 hours, account transitions clear the cache, and mutations are never replayed automatically.

Operational readiness includes a database-aware `/api/health` endpoint, sanitized request correlation IDs, and minimal structured 5xx logs. See `docs/operations/production-readiness.md`; these controls are a baseline and do not authorize real-student production use.

`SessionTimelineEvent` is a classroom-facing stream for start, attendance update/correction, end, and cancellation events. It stores only sanitized identifiers, timestamps, state changes, and counts. `AuditLog` is separate: it records mutation accountability across all domain entities and is not presented as the teacher's classroom narrative. A partial unique index on live sessions closes the concurrent-start race for each teacher.

## Attendance reporting boundary

`attendance-report.service` owns tenant/role scope, current-term defaults, school-timezone date boundaries, aggregation, and CSV serialization. Its repository always begins with `schoolId`; teacher callers are forcibly narrowed to their linked `teacherId`, while managers may apply school-wide classroom, subject, teacher, term, and date filters. Aggregates group by student, classroom, and subject so names or subjects never merge distinct classes.

Attendance correction and cancellation are commands, not generic updates. Corrections require owner/admin context, a completed session, an enrolled student, an existing attendance row, a reason, and the expected record version. The current row changes transactionally while `AttendanceCorrection` preserves before/after status and note. Cancellation is a forward-only transition with a reason and actor/time metadata. Free-text reasons are stored on their domain records but excluded from audit/timeline JSON metadata.

The dashboard derives missed, cancelled, live, completed, and incomplete-attendance counts from the same tenant-scoped session data. Re-entering a live session is a read of the canonical live row rather than a reverse lifecycle transition.

CI runs service, route, component, and Playwright tests against an ephemeral PostgreSQL 16 service. The E2E global setup calls the guarded synthetic bootstrap; teardown removes only its operational session data. Browser state never supplies tenant, actor, role, or teacher identity.

## Dashboard analytics boundary

`dashboard.service` composes the tenant-scoped account, attendance-report, and today services; it does not expose or pass Prisma records to the web application. The authenticated session is the only source of school, role, and teacher identity. Teacher requests are forcibly limited to their linked teacher profile and exact current-term assignments. Manager responses are explicitly labeled school-wide and may apply validated 7/30-day, term, teacher, classroom, or subject filters.

Every dashboard response includes `scope` (`TEACHER`, `SCHOOL`, or `TEACHER_FILTERED`), `viewerRole`, optional manager `selectedTeacher`, `availableTeachingContexts`, and optional `selectedTeachingContext`. These fields describe data scope, not authenticated identity. School-wide and teacher-filtered manager states use distinct copy and visual treatment.

Attendance comparisons group by stable classroom and subject IDs. This keeps classroom A and B separate even when both teach the same subject or share a display name. Repeated-absence alerts inherit the same assignment scope, and all dashboard links lead back to routes that independently reauthorize their session or classroom context. Cross-school rows cannot enter the source reports.

Trend dates are created in `School.timezone`. A date with no qualifying operational session has a nullable percentage and is rendered as a gap, not a fabricated zero. Today's attendance is `(present + late) / eligible rows`; completion is `recorded / eligible rows`. Cancelled sessions are excluded from attendance, while live, completed, missed, scheduled, cancelled, and incomplete states remain visible in the operational status summary.

The App Router page performs authenticated service reads on the server. Recharts is confined to small client visualization components that receive serializable contracts. Each figure has a visible legend or value list, a text summary, and explicit empty behavior; route loading and error boundaries provide skeleton and retry states without exposing internal failures.

## Profile and onboarding boundary

`profile.service` owns self-profile mutations, general school-profile mutations, verified email changes, and new-school registration. Authenticated profile operations use trusted `schoolId` and `userId`; school profile writes reject teachers. Registration is the only pre-tenant path and creates a brand-new tenant plus owner only after verification. Raw verification tokens and passwords never enter audit metadata or token columns.
