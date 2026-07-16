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

`.github/workflows/ci.yml` runs for pull requests and pushes to `main`. It provisions an ephemeral PostgreSQL 16 service, installs pnpm through Corepack, restores the pnpm store cache, applies committed migrations with `prisma migrate deploy`, and then runs database tests, authenticated API tests, Playwright Chromium E2E, lint, and build. CI uses synthetic data, a CI-only database password, and safe login-rate defaults. Playwright bootstraps explicit synthetic classroom fixtures and removes its operational session data in global teardown.

## Authenticated API foundation

Next.js route handlers under `apps/web/app/api` expose students, classrooms, timetables, sessions, attendance, assessments, scores, staff accounts, and teaching assignments. Every protected handler resolves the opaque session cookie at request time and derives tenant, actor, role, and teacher identity from that trusted record. Request bodies cannot override those identities.

Successful responses use `{ "data": ... }`; errors use `{ "error": { "code", "message", "fieldErrors?" } }`. Sensitive responses are `no-store`. Cookie-authenticated mutations require a verified public host origin (or browser `Sec-Fetch-Site: same-origin` when `Origin` is absent), valid JSON content type, and bodies no larger than 64 KiB.

Login attempts are limited by a one-way hash of normalized email plus client IP. Defaults are five attempts per fifteen minutes with at most 10,000 in-memory buckets; configure them with `AUTH_LOGIN_RATE_LIMIT_MAX`, `AUTH_LOGIN_RATE_LIMIT_WINDOW_MS`, and `AUTH_LOGIN_RATE_LIMIT_MAX_BUCKETS`. The current implementation is appropriate for one application instance; multi-instance deployment requires Redis or another shared atomic store.

Owner/admin account services can list and create staff, enable or disable accounts, assign teacher profiles, and create multiple term/classroom/subject teaching assignments. Admins cannot create or modify owners. Disabling an account revokes all active sessions in the same transaction. Temporary passwords are explicit inputs, hashed immediately, and excluded from audit metadata.

## Admin console

Authenticated owner/admin screens are available at `/staff`, `/classrooms`, `/subjects`, `/academic-years`, and `/terms`. Initial lists are rendered on the server; focused client components handle filters, forms, confirmation dialogs, and refreshes through the authenticated API. Teachers are redirected away from admin-only pages and see a read-only `/classrooms` view limited to their assignments.

Navigation and the landing dashboard are derived from the trusted session role; there is no client-controlled workspace switch. Teachers land in a personal workspace with ภาพรวม, ชั้นเรียนของฉัน, ตารางสอน, Live Class, เช็คชื่อ, สมุดคะแนน, รายงานของฉัน, เอกสาร, and โปรไฟล์. Owners and admins land in ภาพรวมโรงเรียน and receive the school-management navigation; only owners receive ตั้งค่า. Rendering a hidden link is never treated as authorization: every protected page and API handler revalidates role and tenant scope. The `(teacher)` and `(admin)` route groups add role-specific server layouts without changing public URLs.

The teacher dashboard never renders a teacher selector. Its classroom and dependent subject options come from a trusted `TeachingContext` built from the authenticated teacher's current-term assignments. A single context is preselected; multiple contexts remain separate by teaching-assignment ID. Managers may view an explicitly labeled school-wide aggregate or select a teacher without changing their authenticated identity. `/staff` and all staff-management APIs remain owner/admin-only.

Staff accounts are created with a one-time temporary password input that follows the existing password policy. The password is never returned or audited. Disabling an account requires an in-app confirmation and revokes active sessions transactionally. Teacher profiles and teaching assignments remain separate steps so one teacher can hold multiple classroom/subject assignments in the same term without merging classroom data.

Subject, classroom, academic-year, and term mutations are tenant-scoped and audited. PostgreSQL partial unique indexes enforce at most one current academic year and one current term per school; service transactions also clear the previous current selection and keep a current term's academic year current.

## Operational classroom workflow

The authenticated dashboard and `/timetable` now use real tenant-scoped data. Timetable entries belong to the current term and retain the exact teaching assignment behind their school, year, term, teacher, classroom, and subject context. Teachers see only their assignments; owner/admin users can filter school-wide entries by teacher, classroom, or subject.

`GET /api/me/today` interprets the current date in `School.timezone`. Starting a scheduled item materializes one dated session from its timetable entry, snapshots its assignment, and then transitions `scheduled → live`. A teacher may have only one live session. The `/live` and `/sessions/:id` screens provide the Live Class flow, manual roster attendance, confirmed session end, and a read-only summary. Session timeline entries are teacher-facing operational events; `AuditLog` remains the compliance record for every mutation.

## Attendance reporting and hardening

`/attendance` provides Thai school-wide or exact-assignment reports by current term, date, classroom, subject, and teacher. Rows remain separated by classroom and subject. Attendance percentage is `(present + late) / expected attendance rows`; completed, live, and missed past sessions count, future scheduled sessions do not, and cancelled sessions are excluded. CSV export is UTF-8 with BOM, fixed columns, explicit scope/date metadata, formula-injection escaping, and a safe generated filename.

Start, end, attendance-save, and daily materialization retries are idempotent where the intended result already exists. The UI preserves unsaved attendance selections in session storage and warns before leaving. Scheduled sessions may be cancelled with a reason; cancelling a live session is manager-only. Neither completed nor cancelled sessions can be reopened. Owner/admin users may correct an existing completed-session attendance row only with a reason; every correction stores immutable before/after values, adds a timeline event, and writes a separate sanitized audit entry.

Run the synthetic browser suite with `pnpm e2e`. It covers teacher login, start/resume, attendance changes, save, end and summary, manager reporting, exact assignment isolation, and an unauthorized admin route. No production or real student data is used.

## Dashboard analytics

The authenticated dashboard combines the existing start/resume and today-schedule actions with tenant-safe attendance analytics. Teachers receive only their exact teaching assignments; each classroom and subject remains a separate comparison row even when names or subjects match. Owners and admins receive an explicitly labeled school-wide view with optional 7/30-day, term, teacher, classroom, and subject filters. API responses declare `scope` as `TEACHER`, `SCHOOL`, or `TEACHER_FILTERED`, include `viewerRole`, and expose only validated available teaching contexts.

Today's attendance percentage is `(present + late) / eligible attendance rows`. Completion percentage is `recorded rows / eligible rows`. Trend points use `School.timezone`; a day without a qualifying session is represented as no data, never as invented 0% attendance. Donut, line, comparison, and session-status visualizations include visible values, text summaries, empty states, keyboard-visible links, and labels that do not depend on color alone.
