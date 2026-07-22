# Classroom OS Product Bible

> **Authority:** This document is the single source of truth for Classroom OS product direction, architecture, UX, security, delivery standards, and established decisions. All contributors and AI coding agents must read it before planning or implementing repository changes. When another document conflicts with this one, stop and resolve the conflict before proceeding.

Last reviewed: 2026-07-16

## How to read this document

Capability statements use these status labels:

- **Implemented** — present in the repository and covered by the current validation workflow.
- **Partially implemented** — a foundation or limited surface exists, but the product workflow is incomplete.
- **Planned** — approved direction that has not yet been implemented.
- **Deferred** — intentionally outside the current delivery horizon or blocked on governance.

The labels describe the repository at the review date, not a guarantee that every production-readiness requirement is complete.

### Current delivery snapshot

| Capability | Status |
| --- | --- |
| PostgreSQL/Prisma, tenant services, auth, audit, administration foundations | **Implemented** |
| Web Today, Live Class, manual attendance, corrections, attendance reports, role dashboards | **Implemented** |
| Gradebook | **Partially implemented:** schema/services/API exist; web UI uses mock data |
| Import Center | **Planned:** navigation and placeholder only |
| Document Center | **Planned:** role-aware placeholder only |
| Teacher Mobile App and offline operation | **Planned:** no application implementation yet |
| QR attendance | **Planned/undecided:** not implemented and not part of the approved current workflow |
| Student App and Parent App | **Planned after MVP** |
| AI assistance | **Deferred** pending core workflows and governance |
| Face recognition/biometrics | **Deferred and prohibited** until explicit governance gates are met |

## 1. Product identity

- **Product name:** Classroom OS
- **Vision:** The Operating System for Teachers
- **Primary promise:** Teachers spend less time managing classroom administration and more time teaching.

Classroom OS is positioned around four commitments:

1. The **Teacher Mobile App** is the primary daily workspace for teachers.
2. The **Web application** is the comprehensive administration and detailed-management workspace.
3. Data is entered once and reused everywhere through trusted, shared domain context.
4. Everything begins from the class and `ClassSession` context.

Classroom OS is not a generic school ERP. Its center of gravity is the teacher's real classroom day, supported by safe school administration.

## 2. Product principles

1. **Mobile first for daily teacher operations.** Starting class, taking attendance, recording scores, and seeing the next action must be fastest on mobile.
2. **Web first for administration and complexity.** People, academic structure, imports, detailed tables, and school-wide reporting belong on web.
3. **Three-tap principle.** A common teacher action should normally require no more than three deliberate taps from the relevant starting screen.
4. **Zero-training usability.** Labels, hierarchy, defaults, and feedback should make the next action self-evident.
5. **One-handed mobile operation.** Primary actions belong within comfortable thumb reach and may not depend on precision gestures.
6. **Calm, uncluttered interfaces.** Prioritize the immediate class context; progressively disclose secondary information.
7. **Server as source of truth.** Client state may improve responsiveness but never defines tenant, actor, role, teacher identity, or canonical workflow state.
8. **Strict tenant and classroom isolation.** Every operation is school-scoped, and teacher access is constrained to exact teaching assignments.
9. **No implicit cross-class aggregation.** Same-named subjects, classes, or students are never merged without an explicit, authorized reporting scope.
10. **No fake data in production workflows.** Mock and synthetic data are limited to development, tests, and clearly marked prototypes.
11. **Accessibility by default.** Semantic structure, keyboard access, visible focus, sufficient contrast, text alternatives, and minimum touch sizes are baseline requirements.
12. **Security and privacy by design.** Least privilege, safe defaults, minimal sensitive data, auditability, and child-data protection are design inputs rather than later additions.

## 3. Product surfaces

| Surface | Primary users | Responsibilities and features that belong | Features that must not appear |
| --- | --- | --- | --- |
| **School Administration Web** | `SCHOOL_OWNER`, `ADMIN` | School dashboard, students, staff, classrooms, subjects, academic years/terms, schedules, teaching assignments, imports, settings, documents, school-wide reports | A client-controlled identity switch; unscoped cross-tenant data; mobile-first in-class interaction as the primary workflow |
| **Teacher Web Workspace** | `TEACHER` | Personal dashboard, assigned classes, detailed timetable, class history, detailed gradebook, detailed reports, lesson resources, documents, profile | Staff management, school settings, school-level imports, teacher selector, unassigned classes, implicit school-wide metrics |
| **Teacher Mobile App** | `TEACHER` | Today, next class, Live Class, attendance, rapid score entry, class actions, profile, resilient retry states | School administration, dense desktop tables, teacher selector, unrestricted file administration, complex setup workflows |
| **Personal Teacher Workspace** | Personal `SCHOOL_OWNER` with linked teacher profile | Own students, classrooms, subjects, teaching assignments, timetable, Live Class, attendance, scores, profile | Staff administration, school-wide imports, other tenants, unassigned teaching contexts |
| **Future Student App** | Future `STUDENT` | **Planned:** own timetable, assignments, results, teacher-published resources and notices | Staff tools, other students' records, teacher workflow controls, school configuration |
| **Future Parent App** | Future `PARENT` | **Planned:** authorized child summaries, attendance notices, published results and communications | Direct grading, classroom operations, unrelated children, staff or school configuration |

Current status: School Administration Web and Teacher Web are **partially implemented**. Teacher Mobile, Student App, and Parent App are **planned**.

## 4. User roles and permissions

Current roles are `SCHOOL_OWNER`, `ADMIN`, and `TEACHER`. `STUDENT` and `PARENT` are future roles and are not present in the current schema or authentication system.

Legend: **Full** = tenant-wide authorized management; **Assigned** = exact teaching-context access; **Own** = own published data only; **No** = prohibited; **Planned** = future capability.

| Capability | `SCHOOL_OWNER` | `ADMIN` | `TEACHER` | Future `STUDENT` | Future `PARENT` |
| --- | --- | --- | --- | --- | --- |
| Staff management | Full, including owner operations | Full except owner operations | No | No | No |
| Classroom management | Full | Full | Assigned, read-focused | Own membership planned | Child membership planned |
| Subject management | Full | Full | Assigned, read-focused | Own subjects planned | Child subjects planned |
| Academic year/term management | Full | Full | Read current context | Planned read | Planned read |
| Timetable management | Full | Full | Assigned timetable; limited teacher actions | Own timetable planned | Child timetable planned |
| Teaching assignments | Full | Full | Read own assignments | No | No |
| Live Class | Oversight and authorized operational access | Oversight and authorized operational access | Assigned classes | No | No |
| Attendance | Full reporting and authorized correction | Full reporting and authorized correction | Assigned session entry/reporting | Own record planned | Child record planned |
| Gradebook | Full authorized scope | Full authorized scope | Assigned class/subject | Own published results planned | Child published results planned |
| Reports | School-wide | School-wide | Personal/assigned | Own planned | Child planned |
| Imports | Full | Full | No | No | No |
| Documents | School administration | School administration | Assigned/personal resources | Published resources planned | Published resources planned |
| Settings | Full, including owner-only security controls | General school profile only; no owner/security controls | Own profile only | No | No |

Role checks are enforced server-side. Navigation visibility is never an authorization boundary.

## 5. Workspace separation

### Teacher Workspace

The Teacher Workspace contains:

- personal dashboard;
- assigned classes;
- timetable;
- Live Class;
- attendance;
- gradebook;
- personal reports;
- documents;
- profile.

### School Administration

School Administration contains:

- school dashboard;
- students and staff;
- classrooms and subjects;
- academic calendar;
- timetable administration and teaching assignments;
- imports;
- school reports;
- documents;
- settings where role permits.

The separation is mandatory. A `PERSONAL` workspace is a tenant-isolated exception in which one account owns the workspace and has a linked Teacher Profile; Mobile still exposes teacher operations only:

- Teacher identity comes from the authenticated context.
- Teachers never select or inspect another teacher through a teacher filter.
- A manager's teacher filter is an oversight scope, not identity switching.
- Teacher navigation must never contain staff, school settings, school imports, or other school-management functions.
- Direct URLs and API calls must repeat the same role and scope enforcement.

Status: role-derived navigation, dashboard modes, and staff-route protection are **implemented**. Several destination pages remain **partial** or placeholders.

## 6. Trusted Teaching Context

The canonical `TeachingContext` is:

```ts
type TeachingContext = {
  schoolId: string;
  academicYearId: string;
  termId: string;
  teachingAssignmentId: string;
  teacherId: string;
  classroomId: string;
  subjectId: string;
};
```

The current shared API display contract omits `schoolId` because school scope is carried separately by `TrustedAuthContext`; conceptually, `schoolId` remains part of every trusted context.

### Derivation and validation

1. `schoolId`, user role, and the teacher profile identity come from the validated server session.
2. `TeachingAssignment` is loaded within that school and establishes the valid term–teacher–classroom–subject combination.
3. Academic year is derived through the assignment's term.
4. Timetable entries, sessions, attendance, and assessments must match the same canonical assignment.
5. Every referenced record is checked within the same tenant before use.

Teachers may select only among their available assignment contexts, normally classroom followed by dependent subject. Managers may select term, teacher, classroom, subject, or assignment for oversight, but the resulting combination must match an existing assignment in their school.

Invalid examples include:

- a client-supplied `teacherId` that differs from the authenticated teacher;
- classroom A combined with a subject assigned only to classroom B;
- a teacher combined with another teacher's classroom;
- IDs from another school;
- a timetable, session, attendance record, or assessment that does not match the canonical assignment.

The same subject taught in classrooms A and B produces two contexts. One teacher may hold many contexts across classes and subjects. During Live Class, the session's assignment context is locked; changing a selector cannot re-scope an active session.

Status: trusted assignment derivation and dashboard context validation are **implemented**. Effective-dated assignment history and roster snapshots require further work.

## 7. Core domain model

The implementation-level source of truth is [Classroom OS Data Model](../architecture/data-model.md). Responsibilities are summarized here:

| Entity | Responsibility |
| --- | --- |
| `School` | Tenant root, identity, timezone, activation state |
| `AcademicYear` | School academic-year boundary |
| `Term` | Scheduling, enrollment, assignment, session, and assessment period |
| `User` | Authenticated school account and role |
| `Teacher` | Staff teaching profile linked to assignments and optionally to a user |
| `Student` | Tenant-owned learner identity |
| `Classroom` | Stable school class/homeroom grouping |
| `Subject` | Tenant subject catalog entry |
| `ClassEnrollment` | Student membership in a classroom for a term |
| `TeachingAssignment` | Exact term–teacher–classroom–subject authority boundary |
| `TimetableEntry` | Recurring weekly schedule template tied to an assignment |
| `ClassSession` | Dated operational classroom occurrence and immutable context snapshot |
| `AttendanceRecord` | One student's attendance state in one session |
| `AttendanceCorrection` | Immutable before/after record for an authorized completed-session correction |
| `Assessment` | Scored activity for one term, classroom, subject, and teacher |
| `Score` | One student's result for one assessment |
| `AuditLog` | Compliance-oriented record of a mutation and safe metadata |
| `SessionTimelineEvent` | Teacher-facing operational history for a class session |
| `AuthSession` | Revocable persisted session containing only a token hash |

`AuthenticationEvent` also exists for sanitized login success, failure, and logout security events.

## 8. Core workflows

### School onboarding — partially implemented

1. Register a new school and verify the owner email. Self-registration always creates a new tenant and `SCHOOL_OWNER`; joining an existing school requires an invitation.
2. Configure timezone and school identity.
3. Create the current academic year and term.
4. Add subjects, classrooms, staff, and students.
5. Create enrollments and teaching assignments.
6. Build the timetable and verify conflicts.

The Web and Teacher Mobile surfaces provide the self-registration foundation. Development can surface a one-time verification token locally; production email delivery, invitation acceptance, legal notices, support operations, and automated provisioning are not complete. Teacher Mobile never gains school-administration capabilities from this flow.

### Teacher account provisioning — implemented foundation

1. Owner/admin creates a teacher user with a temporary password.
2. Service hashes the password immediately and excludes it from responses/audit metadata.
3. Owner/admin creates the teacher profile and employee code.
4. Owner/admin adds one or more teaching assignments.
5. Teacher signs in and receives only their assignment-scoped workspace.

### Assigning one teacher to multiple classrooms — implemented

Create a separate `TeachingAssignment` for each term–classroom–subject combination. Never collapse two classrooms because their subject or teacher matches.

### Timetable creation — implemented

1. Select a valid teaching assignment.
2. Enter weekday, start/end time, and room.
3. Validate time order and tenant references.
4. Reject overlaps for the teacher or classroom.
5. Persist the recurring entry and audit the mutation.

### Teacher daily workflow — web implemented, mobile planned

1. Authenticate and open Today/personal dashboard.
2. Review next class or resume the one live class.
3. Start the scheduled class.
4. Take attendance and perform class actions.
5. End the session and review its summary.

### Materialize and start a session — implemented

1. Select a visible timetable entry and school-local date.
2. Validate weekday, term, assignment, and access.
3. Create or return the unique dated session occurrence.
4. Transition `SCHEDULED → LIVE` if no conflicting live session exists.
5. Lock the session to its canonical assignment snapshot.

### Attendance — implemented foundation

1. Load the canonical session roster from authorized enrollment.
2. Explicitly mark all present or choose individual statuses.
3. Save one validated batch with no duplicate student IDs.
4. Preserve pending browser changes and warn before navigation.
5. Return the canonical saved roster and timeline event.

### Correct completed attendance — implemented

1. Owner/admin opens an existing completed-session record.
2. Provide new status/note, reason, and expected record version.
3. Validate role, enrollment, current version, and existing record.
4. Update transactionally and append immutable correction, timeline, and audit records.

### End or cancel a session — implemented

- A live session may end as completed.
- A scheduled session may be cancelled with a reason.
- Cancelling a live session is manager-only.
- Completed/cancelled sessions remain read-only.

### Attendance reports — implemented

Select authorized term/date/classroom/subject/teacher scope, review non-merged aggregates and details, and export safe UTF-8 CSV.

### Future score entry — partially implemented

Assessment/score schema, validation, tenant services, and API routes exist. A production gradebook workflow, grading schemes, weights, safe bulk editing, and real-data web/mobile experiences remain planned.

### Future data import — planned

Download a versioned template, upload CSV/XLSX, map columns, preview validation, confirm persistence, and download an error report. The current import route is a placeholder and performs no file processing.

## 9. Mobile product standard

The Teacher Mobile App is the highest-priority next product surface.

Required primary navigation:

- วันนี้
- ชั้นเรียน
- Live Class
- คะแนน
- โปรไฟล์

Mobile requirements:

- minimum 44×44 point touch targets;
- one-handed operation and thumb-reachable dominant actions;
- one visually dominant next action per operational state;
- no dense desktop tables or hover-dependent interactions;
- no school administration or teacher selector;
- explicit loading, offline, timeout, retry, and partial-failure states;
- visible pending-change state and protection against losing unsynced work;
- no silent duplicate mutation retries;
- authenticated mobile sessions using an approved token adapter and secure OS storage;
- environment-based API base URL with no production endpoint hard-coded in source.

Status: **Planned**. `apps/mobile` currently contains only a README; no Expo application or mobile authentication adapter is implemented.

## 10. Web product standard

### Teacher Web

Teacher Web is appropriate for detailed gradebooks, detailed reports, class/session history, lesson resources, and complex but assignment-scoped tables.

### School Administration Web

School Administration Web owns people, academic structure, schedules, teaching assignments, imports, settings, document administration, and school-wide reports.

Web must not replace or deprioritize the daily mobile teacher flow. A web capability does not mean the corresponding mobile task is complete.

## 11. Dashboard standard

### Teacher dashboard

Order and emphasis:

1. next class or resume Live Class;
2. today's schedule;
3. attendance status;
4. assigned-class comparison;
5. action-required items;
6. personal trend.

It must not show a teacher selector or unassigned contexts.

### Manager dashboard

The default is explicitly labeled school-wide aggregation. It may show attendance donut, trend, classroom comparison, session status, operational alerts, and validated term/teacher/classroom/subject filters. A teacher-filtered view must say whom the manager is viewing and must remain visually distinct from the school aggregate.

All dashboards must:

- represent no-session trend days as nullable/no data, never fabricated zero;
- group by stable classroom and subject IDs, not display names;
- avoid implicit classroom merging;
- include visible chart values, legends or text summaries, accessible labels, and non-color-only meaning.

Status: role-separated dashboards and these foundations are **implemented**.

## 12. Live Class standard

Canonical states are `SCHEDULED`, `LIVE`, `COMPLETED`, and `CANCELLED` (stored as lowercase enum values in Prisma/API contracts).

Allowed transitions:

```text
SCHEDULED → LIVE
SCHEDULED → CANCELLED
LIVE      → COMPLETED
LIVE      → CANCELLED  (manager authorization required)
```

Rules:

- Materialization, start, end, attendance save, and safe retries are idempotent when the intended canonical result already exists.
- `(timetableEntryId, scheduledStart)` prevents duplicate materialization.
- A teacher may have only one live session; a PostgreSQL partial unique index closes concurrent-start races.
- The teaching context is locked when the session is created.
- Completed and cancelled sessions are read-only except the explicit attendance-correction command.
- `SessionTimelineEvent` is an operational teacher-facing narrative; `AuditLog` is the compliance record. Neither replaces the other.

## 13. Attendance standard

Statuses are `PRESENT`, `LATE`, `ABSENT`, and `LEAVE` (lowercase in persisted/API enum values).

Rules:

- only students enrolled in the canonical term/classroom are eligible;
- access requires the exact assignment context;
- saves are batched and reject duplicate student IDs;
- version/expected-update fields protect state transitions and completed corrections from stale writes;
- ordinary live-session attendance currently uses idempotent batch replacement but does not yet expose full optimistic version checking; explicit stale-write conflict handling is required before offline or multi-editor attendance;
- mark-all-present must be an explicit user action, never an automatic default;
- ordinary attendance cannot edit a completed session;
- completed correction requires owner/admin role, an existing row, a reason, and immutable before/after history;
- CSV exports include explicit scope/date metadata, safe filenames, UTF-8 BOM, and spreadsheet-formula escaping;
- cancelled and future scheduled sessions are excluded from attendance denominators.

**Known limitation:** historical reports reconstruct eligibility from term enrollment rather than an effective-dated per-session roster snapshot. A future roster snapshot strategy is required for students who join, leave, or move mid-term.

## 14. Gradebook standard

Status: **Partially implemented**. Assessment and score persistence/services/API foundations exist. The current web gradebook displays mock data and is not a production grading workflow.

Planned rules:

- support quiz, homework, exam, project, participation, and other assessment types;
- require `maxScore > 0` and `0 ≤ score ≤ maxScore`;
- introduce explicit weights without silently changing raw scores;
- define tenant-configurable grading schemes and rounding policy;
- distinguish missing/unentered scores from zero;
- isolate every assessment and score by school, term, classroom, subject, and teaching assignment;
- authorize only enrolled students and assigned teachers;
- provide safe CSV export and controlled bulk entry;
- use web for detailed setup/review and mobile for rapid in-class entry.

## 15. Import Center standard

Status: **Planned**. The current School Administration route is intentionally a placeholder.

The Import Center will provide:

- versioned standard templates;
- CSV and XLSX support;
- deterministic and assisted column mapping;
- preview before persistence;
- row-level validation and downloadable error reports;
- explicit `CREATE_ONLY` mode;
- safe, key-defined `UPSERT` mode with visible change previews;
- bounded transactions or well-defined chunk transactions;
- immutable import history and actor/timestamp metadata;
- strict tenant isolation.

Initial templates:

1. students;
2. teachers;
3. classrooms;
4. subjects;
5. teaching assignments;
6. timetable.

Plaintext password imports are prohibited. Teacher account imports must use a separate secure invitation or temporary-credential flow. Arbitrary PDF-to-database extraction is prohibited. Imports belong only to School Administration Web.

## 16. Document Center standard

Status: **Planned**. The current route is a role-aware placeholder with no upload or storage.

Structured import and document storage are different systems: imports create validated domain records; documents preserve authorized files and metadata.

The Document Center should support approved office documents, PDFs, images, and teaching resources subject to policy. Each item needs safe display/original names, MIME type, size, checksum, storage key, owner/actor, timestamps, visibility, and optional school/classroom/subject/term relationships.

Requirements:

- abstract storage interface rather than local filesystem coupling;
- safe generated storage keys and sanitized download filenames;
- allowlisted MIME/extensions and file-size limits;
- malware/scanning integration before availability;
- authorized visibility and tenant-scoped lookup;
- no uploaded files committed to Git;
- retention, deletion, and audit behavior defined before production use.

## 17. API standards

Success envelope:

```json
{ "data": {} }
```

Error envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Safe client-facing message",
    "fieldErrors": {}
  }
}
```

Standards:

- resolve `TrustedAuthContext` server-side for every protected request;
- propagate tenant/actor values by replacement from the trusted context, never by merging client values;
- map stable domain/auth codes to HTTP status without leaking database details;
- cookie-authenticated mutations require same-origin validation;
- mutation bodies require JSON content type and the current 64 KiB limit unless an explicitly reviewed upload endpoint uses a different bounded contract;
- raw Prisma and generated model types never cross the database package boundary;
- never serialize stack traces, SQL, connection strings, hashes, or cross-tenant existence;
- design materialization and state commands for explicit idempotency and conflict responses;
- cursor pagination is the future standard for unbounded collections; offsets are not the default for large mutable data.

## 18. Authentication and authorization

Current web foundation:

- Argon2id password hashes;
- random opaque session tokens;
- only SHA-256 token hashes persisted in `AuthSession`;
- `HttpOnly`, `SameSite=Lax`, production-`Secure` cookies;
- active user, school, teacher profile, expiry, and revocation checks on session resolution;
- disabling an account revokes active sessions transactionally;
- role enforcement plus exact teacher assignment enforcement;
- login limiting keyed by a one-way hash of normalized email and client IP;
- sanitized authentication/audit metadata without passwords, raw tokens, password hashes, or raw login identifiers.

Mobile authentication is **planned**. It must use a dedicated mobile session/token exchange, short-lived or revocable credentials, secure OS keychain/keystore storage, explicit logout/revocation, and no web-cookie assumptions.

## 19. Security and privacy

Required posture:

- tenant-first queries and repositories;
- exact classroom/assignment authorization;
- least privilege for people, services, database credentials, storage, and CI;
- secrets supplied through approved environment/secret stores;
- local `.env` files ignored and no real credentials committed;
- sanitized, immutable audit events with a defined retention policy;
- safe upload validation, scanning, storage isolation, and download authorization;
- collection and display of only necessary student data;
- production privacy notices, retention/deletion, incident response, and access review before real student onboarding.

### Child biometric data

Face recognition is **deferred and prohibited** until all of the following exist:

1. an explicit, revocable consent model;
2. completed legal and privacy review for every operating jurisdiction;
3. documented retention, deletion, and subject-access policy;
4. precise role/access controls and non-biometric alternatives;
5. completed security/threat-model review.

No agent may add biometric schema, collection, inference, or matching functionality without explicit approval that addresses these gates.

## 20. Data integrity standards

- Use PostgreSQL UUIDs for primary IDs.
- Add sensible tenant-scoped unique constraints and tenant-first indexes.
- Review generated migration SQL before application.
- Prefer additive/backward-compatible migrations when practical; destructive changes require explicit migration and rollback planning.
- Keep Prisma inside tenant-scoped repositories; public services require `schoolId`.
- Validate primitive input with shared schemas and database-dependent rules in services.
- Make related mutations and audit creation transactional.
- Use PostgreSQL-specific partial indexes where they close real concurrency races.
- Preserve partial unique indexes for one current academic year/term per school and one live session per teacher.
- Keep duplicate enrollment, attendance, and score prevention in database constraints.
- Design effective-dated roster/session snapshots before claiming historically exact enrollment reporting.

## 21. Testing standards

Future changes must run the validation appropriate to their risk:

- unit tests for pure rules and validation;
- PostgreSQL integration tests for repositories, transactions, constraints, and services;
- authenticated API tests for envelopes and trusted-context behavior;
- multi-class and same-subject isolation tests;
- role, direct-URL, and query-manipulation tests;
- Playwright E2E for critical user journeys;
- `pnpm lint`;
- `pnpm build`;
- `git diff --check`;
- browser console-error assertions on covered flows.

Use synthetic data only. Tests must clean up records they create, never reset unrelated databases, and never depend on production services or real student data.

## 22. Development workflow

Mandatory sequence:

1. Confirm a clean worktree; stop if the task requires cleanliness and it is dirty.
2. Read this Product Bible, repository instructions, and relevant implementation/docs.
3. Write a concise plan before editing.
4. Implement only the authorized scope and preserve unrelated work.
5. Run proportional validation and fix failures.
6. Review the diff for secrets, environment files, generated output, real data, and unintended scope.
7. Do not commit or push automatically unless the user explicitly requests it.
8. Use Conventional Commit messages.
9. Commit one coherent phase or feature at a time.

## 23. Coding standards

- TypeScript is the application and shared-package language.
- Keep components and modules small, focused, and named for one responsibility.
- Prefer server-first web fetching and Server Components.
- Use focused client components only for interaction, local transient state, or browser APIs.
- Do not create giant pages or client components.
- Do not add a large UI framework without documented need and approval.
- Put API-facing contracts in `@classroom-os/types`; do not duplicate Prisma models.
- Keep raw Prisma internal to `@classroom-os/database` repositories.
- Use stable, reusable domain errors and one mapping layer.
- Do not duplicate business rules across route handlers and UI.
- Use clear lowercase kebab-case filenames and established Next.js conventions.
- Use Thai for user-facing UI and English for machine identifiers, code, API fields, and database names.

## 24. Design system

Current repository tokens in `packages/ui/src/tokens.ts` are authoritative:

| Token | Value |
| --- | --- |
| Primary | `#2563EB` |
| Primary dark | `#1D4ED8` |
| Primary soft | `#EFF6FF` |
| Success | `#16A34A` |
| Warning | `#D97706` |
| Danger | `#DC2626` |
| Background | `#F7F8FA` |
| Surface | `#FFFFFF` |
| Text | `#111827` |
| Muted text | `#6B7280` |
| Border/line | `#E5E7EB` |
| Sidebar | `#111827` |

Use a consistent 4/8-based spacing rhythm, rounded cards with restrained shadows, clear border separation, text-labeled status badges, and visible two-pixel-equivalent focus treatment. Interactive web controls and all mobile controls should meet at least 44×44 target size. Charts require text summaries, legends/labels, sufficient contrast, and meaning beyond color.

Thai typography must prioritize legibility, adequate line height, correct combining-mark rendering, and no overly tight tracking. The token package currently formalizes colors only; spacing, typography, radii, elevation, motion, and chart tokens remain a follow-up.

## 25. Offline strategy

Status: **Planned for mobile**.

### Phase 1 — online-first

- clear connection, timeout, retry, and failure states;
- preserve unsaved form state where safe;
- explicit confirmation of canonical server results.

### Phase 2 — cached reads

- cache authorized Today, timetable, roster, and recent session reads;
- show freshness timestamps;
- track visible pending local changes separately from server data.

### Phase 3 — mutation queue

- durable mutation queue with stable client operation IDs;
- conflict detection and user-guided resolution;
- background synchronization with observable status and audit-safe reconciliation.

Operations that must never be silently retried include starting/ending/cancelling a session, completed attendance corrections, score publication, account/role changes, imports, destructive changes, and any non-idempotent file mutation. Automatic retries require a proven idempotency key/contract.

## 26. Notifications

Status: **Future scope**.

Potential channels:

- push notification;
- email;
- LINE integration;
- in-app notification.

Likely events include upcoming class, missed attendance, assignment deadline, student absence alert, and report-ready notification. Every channel requires tenant-safe preferences, recipient authorization, deduplication, rate controls, privacy-safe content, delivery audit, and opt-out rules before implementation.

## 27. AI strategy

Status: **Deferred until core workflows and governance mature**.

AI is a teacher assistant, never an autonomous authority. Potential uses include student-risk summaries, lesson summaries, assessment drafts, rubric generation, parent-summary drafts, and explanations of trends.

Rules:

- require human review and confirmation before publishing or changing records;
- never make automatic disciplinary decisions;
- never make hidden grading changes;
- never train on private student data without explicit governance, lawful basis, contracts, and opt-in policy;
- show provenance, source scope, uncertainty, and explainable rationale;
- preserve tenant and teaching-context boundaries in retrieval and generation;
- audit consequential accepted actions without storing unnecessary sensitive prompts.

## 28. Roadmap

### Phase 1 — Foundation: complete

Monorepo, PostgreSQL/Prisma schema, tenant repositories/services, shared contracts, migrations, validation, tests, CI, audit foundation, and authentication foundation.

### Phase 2 — School Administration: in progress

Staff, teacher profiles/assignments, classrooms, subjects, academic calendar, timetable, and server-rendered management foundations exist. Gaps include polished onboarding, production provisioning, imports, storage, pagination, and deeper operational controls.

### Phase 3 — Teacher Workspace: in progress

Role-separated dashboard/navigation, Today/session workflow, manual attendance, correction, reports, and Live Class web foundations exist. Gaps include production gradebook, resources, richer history, and mobile parity.

### Phase 4 — Teacher Mobile: highest priority next

Build the Expo foundation, mobile authentication adapter, Today navigation, next/resume class, Live Class, manual attendance, explicit retry states, and secure configuration.

### Phase 5 — Gradebook and academic workflows

Complete real-data gradebook setup, entry, schemes, weights, publication, exports, and web/mobile responsibilities.

### Phase 6 — Imports and documents

Implement safe templates, previews, validation/history, storage abstraction, upload security, and scoped resources.

### Phase 7 — Student and Parent experiences

Introduce separate identity, consent, authorization, publishing, and privacy models before application UI.

### Phase 8 — Offline, notifications, and production hardening

Add staged offline capability, notification infrastructure, distributed rate limiting/storage, observability, backup/restore, RLS review, and operational policies.

### Phase 9 — AI and biometric features after governance

AI requires human-control and data-governance gates. Biometrics remain prohibited until all consent, legal, retention, access, and security conditions are met.

**Next recommended milestone:** Teacher Mobile foundation with secure authentication, วันนี้, next/resume class, and manual attendance against existing APIs, while explicitly designing retry/idempotency behavior.

## 29. MVP definition

MVP requires:

- authentication;
- school and staff administration;
- students, classes, and subjects;
- teacher assignments;
- timetable;
- teacher Today screen;
- Live Class;
- manual attendance;
- attendance reports;
- production gradebook;
- Teacher Mobile App;
- safe imports.

MVP explicitly excludes:

- face recognition and biometrics;
- Parent App;
- Student App;
- AI automation;
- finance and billing;
- district or ministry dashboards.

The repository has not yet reached this MVP definition because Teacher Mobile, production gradebook, and safe imports are incomplete.

## 30. Established decision records

1. Mobile is the primary teacher surface.
2. Web is the primary school-administration and complex-management surface.
3. Teacher and administration workspaces are separate and role-derived.
4. `TeachingAssignment` is the core multi-class authorization boundary.
5. `ClassSession` is the operational classroom boundary.
6. Clients do not supply authoritative `schoolId`, actor, role, or teacher identity.
7. Raw Prisma stays inside the database package.
8. Imports are template-based, previewed, validated, and administration-only.
9. Charts and aggregates are role- and context-scoped.
10. Biometric features are deferred and prohibited without explicit governance approval.
11. Self-registration may create either a multi-user `SCHOOL` workspace or a single-owner `PERSONAL` teacher workspace; both retain the same tenant and teaching-context isolation.

Intentional changes to these decisions require updating this document in the same coherent change.

## 31. Open risks and follow-ups

- `pg` adapter concurrent-query deprecation warnings need root-cause analysis before the pg 9 upgrade.
- Login rate limiting is process-local and needs a shared atomic store for multi-instance deployment.
- Historical attendance needs effective-dated enrollment or per-session roster snapshots.
- Teaching-assignment removal needs explicit dependency checks and historical-retention policy.
- Documents/imports need distributed object storage and secure scanning.
- Mobile needs a dedicated authentication/session adapter and secure token storage.
- Offline synchronization needs conflict rules, idempotency keys, and user-visible pending state.
- Production monitoring, structured logs, metrics, traces, alerting, and incident processes are incomplete.
- PostgreSQL row-level security should be evaluated as defense in depth.
- Backup, restore testing, point-in-time recovery, and disaster-recovery objectives need definition.
- Audit-log retention, access, export, and deletion policy needs governance.
- Formal design tokens beyond color remain incomplete.
- Production onboarding, privacy notices, retention/deletion, and support operations remain incomplete.

## 32. Mandatory instructions for AI coding agents

All AI coding agents must:

1. Read this document before making a plan or changing files.
2. Preserve mobile-first teacher priorities even when implementing web work.
3. Preserve Teacher Workspace and School Administration separation.
4. Preserve tenant, term, teaching-assignment, classroom, subject, and session isolation.
5. Never weaken authentication or authorization for convenience.
6. Never add real student data, production credentials, or secrets.
7. Never commit `.env` files, raw tokens, password hashes, session cookies, or uploaded private files.
8. Never implement biometric or face-recognition features without explicit approval satisfying the governance gates in this document.
9. Stop and report when task requirements conflict with this document; do not silently choose one.
10. Update this document only when an intentional product or engineering decision changes—not merely because implementation details moved.
11. Distinguish implemented, partial, planned, and deferred behavior in code comments, docs, tests, and handoff reports.
12. Inspect the worktree and preserve unrelated user changes.

This instruction block is mandatory repository governance, not optional guidance.

## 33. Document governance

- This Product Bible owns product principles, surface responsibilities, established decisions, and cross-cutting engineering standards.
- [System Architecture](../architecture/system-overview.md) owns detailed current architecture.
- [Data Model](../architecture/data-model.md) owns entity and persistence detail.
- [API Outline](../api/api-outline.md) owns current transport contracts and routes.
- Code, migrations, and tests determine whether an approved capability is actually implemented.
- When status changes materially, update the relevant detailed document and this Bible's status/roadmap in the same coherent documentation change.
- Historical decisions should eventually move to dated ADRs where trade-offs require durable rationale; the concise decision list above remains authoritative until then.
