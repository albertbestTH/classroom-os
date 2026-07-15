# API Outline

HTTP routes are not implemented yet. This document records the transport-neutral service boundary that future authenticated routes will call.

The Next.js web shell and login server action are implemented, but there is intentionally no general HTTP API surface yet.

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

## Planned HTTP surface

- `POST /sessions/start`
- `GET /sessions/:id`
- `POST /sessions/:id/end`
- `GET /sessions/:id/timeline`
- `GET /sessions/:id/attendance`
- `PUT /sessions/:id/attendance`
- `POST /classes/:classId/assessments`
- `PUT /assessments/:assessmentId/scores`
- `GET /teachers/me/timetable`

Future routes must derive `schoolId` and `actorUserId` from authenticated server context, perform the resource-specific authorization check, call exactly one application service, and map stable error codes without exposing internal errors.
