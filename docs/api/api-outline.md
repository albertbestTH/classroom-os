# API Outline

Authenticated Next.js App Router handlers are implemented under `/api`. They are server-only adapters over the application service boundary; raw Prisma access is not exported.

## Response contract

Success responses are `{ "data": ... }`. Errors are `{ "error": { "code": "...", "message": "...", "fieldErrors": optional } }`. All API responses use `Cache-Control: no-store`. Unknown failures return `INTERNAL_ERROR` with status 500 and a generic message; stack traces and internal database details are never serialized.

## Trusted authentication context

Server code resolves the HttpOnly session cookie into `TrustedAuthContext` containing `userId`, `schoolId`, `role`, and nullable `teacherId`. `schoolId` and `actorUserId` must never be accepted from a request body, query, or client header. Before calling a mutation service, the server constructs tenant input from the trusted context.

Authorization helpers are `requireAuthenticatedUser`, `requireRole`, `requireSchoolAccess`, `requireTeacherProfile`, `requireTeachingAssignment`, `requireClassSessionAccess`, `requireAttendanceAccess`, and `requireAssessmentAccess`/`requireScoreAccess`. Teacher checks always include the exact term, classroom, and subject; assignment to one classroom never grants access to another classroom using the same subject.

| Role | School-wide access | Academic access | Assignment requirement |
| --- | --- | --- | --- |
| `SCHOOL_OWNER` | Settings and all user roles | Full within own school | No |
| `ADMIN` | Users except owner-only operations | Full within own school | No |
| `TEACHER` | None | Assigned classrooms, subjects, sessions, attendance, and assessments | Exact term + classroom + subject |

## Service ownership

| Service | Methods |
| --- | --- |
| Student | `createStudent`, `updateStudent`, `getStudent`, `listStudents` |
| Classroom | `createClassroom`, `updateClassroom`, `getClassroom`, `listClassrooms` |
| Timetable | `createTimetableEntry`, `updateTimetableEntry`, `listTimetableEntries` |
| Session | `createClassSession`, `startClassSession`, `endClassSession`, `getClassSession` |
| Attendance | `updateAttendanceBatch` |
| Assessment | `createAssessment`, `updateScoreBatch` |

Every method requires `schoolId`. At the server boundary, `trustedTenantInput` derives both `schoolId` and `actorUserId` from the session. Raw Prisma clients and generated models are not API results; services return serializable contracts from `@classroom-os/types`.

## Validation ownership

Zod validates request shape, UUIDs, non-empty names, weekday range, time ordering, positive assessment maximums, non-negative scores, and unique student IDs within batches. Services validate database-dependent rules such as enrollment, maximum score, lifecycle state, related-record tenancy, and timetable overlaps. PostgreSQL retains authoritative foreign-key and uniqueness enforcement.

## Error mapping

| Domain code | Future HTTP mapping | Meaning |
| --- | --- | --- |
| `NOT_FOUND` | 404 | Record is missing or not visible in the active school. |
| `TENANT_ACCESS_DENIED` | 403 | Trusted school scope is absent or denied. |
| `CONFLICT` | 409 | Unique or timetable conflict. |
| `VALIDATION_ERROR` | 400 | Shape, value, enrollment, or score validation failed. |
| `INVALID_STATE_TRANSITION` | 409 | Session lifecycle does not allow the operation. |

Messages and details are safe for clients and do not include SQL, connection strings, Prisma internals, or cross-tenant existence information.

Authentication codes map separately: `UNAUTHENTICATED` to 401, `INVALID_CREDENTIALS` to a generic 401 login response, `ACCOUNT_DISABLED` to a generic 403 login response, and `FORBIDDEN` to 403. Login UI deliberately uses the same client-facing message for bad credentials and unavailable accounts. Internal database details are never included.

`RATE_LIMITED` maps to 429. Login rate keys combine normalized email and available client IP, then hash the combination before storage. Limits are configured through `AUTH_LOGIN_RATE_LIMIT_MAX`, `AUTH_LOGIN_RATE_LIMIT_WINDOW_MS`, and `AUTH_LOGIN_RATE_LIMIT_MAX_BUCKETS`.

## HTTP surface

- `GET|POST|DELETE /api/auth/session`
- `GET|POST /api/students`; `GET|PATCH /api/students/:id`
- `GET|POST /api/classrooms`; `GET|PATCH /api/classrooms/:id`
- `GET|POST /api/timetable`; `PATCH /api/timetable/:id`
- `POST /api/sessions`; `GET /api/sessions/:id`; `POST /start`; `POST /end`
- `GET|PUT /api/sessions/:id/attendance`
- `POST /api/assessments`; `PUT /api/assessments/:id/scores`
- `GET|POST /api/staff`; `PATCH /api/staff/:id/status`; `PUT /teacher-profile`
- `GET|POST /api/staff/:id/teaching-assignments`; `GET /api/teaching-assignments`
- `GET /api/staff/:id`
- `GET|POST /api/subjects`; `PATCH /api/subjects/:id`
- `GET|POST /api/academic-years`; `PATCH /api/academic-years/:id`
- `GET|POST /api/terms`; `PATCH /api/terms/:id`

Timetable and assessment creation accept a `teachingAssignmentId`, not teacher/tenant identity fields, and derive term, teacher, classroom, and subject from the scoped assignment. Attendance and score mutations require a classroom context and compare it with the canonical session/assessment before writing.

Cookie-authenticated mutations require an exact same-origin `Origin`, `application/json`, and a body at or below 64 KiB. Deployments behind a proxy must preserve the public request origin correctly.

## Admin console contracts

Staff directory responses include teacher-profile status and teaching-assignment count. Assignment responses include the classroom, subject, term, and academic-year labels needed to display each authorization scope independently. The temporary password is accepted only by staff creation and is never included in a response.

Owner and admin users may list and mutate classrooms, subjects, years, and terms within their school. Admin users cannot create or modify `SCHOOL_OWNER` accounts; teachers receive `403` from admin collection APIs. Request fields such as `schoolId`, `actorUserId`, `teacherId`, and caller role remain non-authoritative and are replaced by the resolved session context.

Creating or marking an academic year current clears the prior current year and any current term from another year. Creating or marking a term current clears the prior current term and marks its parent year current. Start dates must precede end dates, and term dates must fit inside the parent academic year.
