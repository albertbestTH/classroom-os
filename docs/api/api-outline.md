# API Outline

HTTP routes are not implemented yet. This document records the transport-neutral service boundary that future authenticated routes will call.

## Service ownership

| Service | Methods |
| --- | --- |
| Student | `createStudent`, `updateStudent`, `getStudent`, `listStudents` |
| Classroom | `createClassroom`, `updateClassroom`, `getClassroom`, `listClassrooms` |
| Timetable | `createTimetableEntry`, `updateTimetableEntry`, `listTimetableEntries` |
| Session | `createClassSession`, `startClassSession`, `endClassSession`, `getClassSession` |
| Attendance | `updateAttendanceBatch` |
| Assessment | `createAssessment`, `updateScoreBatch` |

Every method requires `schoolId`. Mutation inputs may carry a nullable `actorUserId` until authentication supplies trusted actor context. Raw Prisma clients and generated models are not API results; services return serializable contracts from `@classroom-os/types`.

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

Future routes must derive `schoolId` and `actorUserId` from authenticated server context, call exactly one application service, and map `DomainError.code` without exposing internal errors.
