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
| Today | `getTodayTimetable` |
| Session | `materializeClassSession`, `startClassSession`, `endClassSession`, `cancelClassSession`, `getClassSession`, `listClassSessionTimeline` |
| Attendance | `getSessionAttendanceRoster`, `updateAttendanceBatch`, `correctCompletedAttendance` |
| Attendance report | `getAttendanceReport`, `getAttendanceStudentReport`, `getAttendanceSessionReport`, `createAttendanceReportCsv` |
| Dashboard | `getDashboardOverview` |
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
- `POST /api/mobile/auth/login`; `GET /api/mobile/auth/session`; `POST /api/mobile/auth/logout`
- `GET|POST /api/students`; `GET|PATCH /api/students/:id`
- `GET|POST /api/classrooms`; `GET|PATCH /api/classrooms/:id`
- `GET|POST /api/timetable`; `PATCH /api/timetable/:id`
- `POST /api/sessions` (compatibility materialization); `GET /api/sessions/:id`; `POST /start`; `POST /end`; `GET /timeline`
- `GET|PUT /api/sessions/:id/attendance`; `POST /api/sessions/:id/attendance/corrections`
- `POST /api/sessions/:id/cancel`
- `GET /api/reports/attendance`; `GET /students/:id`; `GET /sessions/:id`; `GET /export`
- `GET /api/dashboard/overview`
- `POST /api/assessments`; `PUT /api/assessments/:id/scores`
- `GET|POST /api/staff`; `PATCH /api/staff/:id/status`; `PUT /teacher-profile`
- `GET|POST /api/staff/:id/teaching-assignments`; `GET /api/teaching-assignments`
- `GET /api/staff/:id`
- `GET|POST /api/subjects`; `PATCH /api/subjects/:id`
- `GET|POST /api/academic-years`; `PATCH /api/academic-years/:id`
- `GET|POST /api/terms`; `PATCH /api/terms/:id`

Timetable and assessment creation accept a `teachingAssignmentId`, not teacher/tenant identity fields, and derive term, teacher, classroom, and subject from the scoped assignment. Attendance and score mutations require a classroom context and compare it with the canonical session/assessment before writing.

Cookie-authenticated mutations require an `Origin` matching the effective public host, or a browser `Sec-Fetch-Site: same-origin` signal when `Origin` is absent, plus `application/json` and a body at or below 64 KiB. Deployments behind a proxy must preserve `Host` and `X-Forwarded-Proto` correctly.

## Admin console contracts

Staff directory responses include teacher-profile status and teaching-assignment count. Assignment responses include the classroom, subject, term, and academic-year labels needed to display each authorization scope independently. The temporary password is accepted only by staff creation and is never included in a response.

Owner and admin users may list and mutate classrooms, subjects, years, and terms within their school. Admin users cannot create or modify `SCHOOL_OWNER` accounts; teachers receive `403` from admin collection APIs. Request fields such as `schoolId`, `actorUserId`, `teacherId`, and caller role remain non-authoritative and are replaced by the resolved session context.

Creating or marking an academic year current clears the prior current year and any current term from another year. Creating or marking a term current clears the prior current term and marks its parent year current. Start dates must precede end dates, and term dates must fit inside the parent academic year.

## Operational timetable and session routes

- `GET /api/me/today` returns the visible current-term schedule, next class, completed/missed/cancelled/incomplete-attendance counts, and school timezone. Teachers receive only their own assignment rows.
- `GET|POST /api/timetable` and `PATCH /api/timetable/:id` return display-safe assignment labels and enforce valid assignments plus teacher/classroom interval conflicts.
- `POST /api/timetable/:id/materialize` accepts `{ "localDate": "YYYY-MM-DD" }`. It derives all trusted context from the timetable entry and returns the existing occurrence on a safe retry.
- `GET /api/sessions/:id`, `POST /start`, `POST /end`, and `POST /cancel` enforce exact assignment access and the forward-only state graph. Start/end accept optional `expectedUpdatedAt`; live cancellation is manager-only and every cancellation requires a reason.
- `GET|PUT /api/sessions/:id/attendance` uses the canonical session classroom and only active enrolled students. PUT accepts a batch plus the matching `classroomId`; identical retries are no-ops. `POST /attendance/corrections` is owner/admin-only, completed-only, reason-required, and version-checked.
- `GET /api/sessions/:id/timeline` returns only sanitized classroom events.

Attendance report endpoints default to the current term and its date range. Teachers are forcibly scoped to their exact assignments; managers may filter school-wide by classroom, subject, teacher, term, and date. Student and session detail endpoints independently reauthorize their target. CSV export is the intentional non-JSON response: it is `no-store`, UTF-8 BOM encoded, formula-injection escaped, and uses a safe fixed-pattern filename.

## Dashboard overview contract

`GET /api/dashboard/overview` derives `schoolId`, role, and teacher identity exclusively from the authenticated session. Accepted query filters are `days=7|30`, `termId`, `teachingAssignmentId`, `classroomId`, `subjectId`, and `teacherId`; unknown, malformed, or trusted-context parameters are rejected. Teachers are fixed to seven days and their authenticated current term, and any supplied `teacherId` or `termId` is rejected. Their classroom/subject filters must match their own current-term assignments. Owners/admins may select 7 or 30 days and filter the school-wide view, but term/teacher/classroom/subject combinations must resolve to a valid same-school teaching context.

The result declares `scope` as `TEACHER`, `SCHOOL`, or `TEACHER_FILTERED`, plus `viewerRole`, optional manager `selectedTeacher`, `availableTeachingContexts`, and optional `selectedTeachingContext`. `selectedTeacher` describes a manager filter and never changes the authenticated actor. A teacher with one available context receives it preselected; multiple contexts remain distinguishable by `teachingAssignmentId` even when two classrooms share the same subject.

The result contains today's attendance and completion totals, operational session statuses, school-timezone trend points, classroom/subject comparison rows, next/live classes, repeated-absence alerts, prioritized actions, and safe filter labels. Attendance is `(present + late) / eligible rows`; completion is `recorded / eligible rows`. Trend points use `percentage: null` when no qualifying session exists, so no-session days are not represented as zero attendance. Classroom comparison keys use classroom and subject IDs, never display labels, preventing same-name or same-subject classrooms from merging.

Materialization, start/end, timetable changes, and attendance changes are audited transactionally. Timeline events are additionally written for teacher-visible session activity. Neither response surface exposes Prisma records, stack traces, tokens, passwords, attendance notes in timeline metadata, or cross-tenant existence information.

After login, all roles redirect to `/`; the server renders the personal Teacher Workspace for `TEACHER` and the school overview for `SCHOOL_OWNER` or `ADMIN`. Role-specific page layouts and every API handler repeat their authorization checks, so navigation visibility and post-login routing are never security controls.

## Native teacher authentication

The mobile login route accepts the same validated email/password input as web login but permits only active `TEACHER` accounts. It returns the one-time raw opaque session token and expiry; the database retains only its SHA-256 hash. Native requests send the token as `Authorization: Bearer <token>`. Session validation and logout require a well-formed bearer token, and logout revokes it server-side. Cookie behavior is unchanged for web clients.

Bearer-authenticated native mutations do not depend on browser Origin/CSRF headers. They retain JSON content-type and size limits plus all role, tenant, assignment, lifecycle, and validation checks. Tokens, passwords, hashes, and credentials are excluded from logs and audit metadata.
