# Production readiness baseline

Classroom OS is not approved for real student data yet. This baseline defines the remaining gates rather than claiming production certification.

## Configuration and secrets

- Inject `DATABASE_URL` and the mobile API base URL through the deployment platform. Never commit `.env` files.
- Use a least-privilege PostgreSQL runtime role; use a separate migration role in CI/CD.
- Terminate TLS at the trusted ingress, require HTTPS, and rotate database and deployment credentials on a documented schedule.
- Keep biometric and face-recognition data out of the system.

## Health and monitoring

`GET /api/health` checks application-to-database readiness, returns no tenant data, disables caching, and includes `x-request-id`. Authenticated API responses also include a request ID. Unexpected server failures emit a minimal structured log with event, path, and request ID; request bodies, cookies, tokens, emails, student names, and database errors are deliberately excluded.

Production alerts should cover health-check failures, elevated HTTP 5xx/429 rates, database saturation, migration failures, and backup failures. Connect the structured logs to the selected monitoring provider before launch and define an on-call owner and escalation path.

## Backup and restore

- Enable provider-managed encrypted PostgreSQL backups with point-in-time recovery where available.
- Keep backups in a separate access boundary and region appropriate to school policy.
- Define retention only after legal and school-owner review; do not retain indefinitely by default.
- Run a restore drill into an isolated non-production account at least quarterly. Validate tenant counts, migrations, audit integrity, and a sample of synthetic attendance/score workflows.
- A backup is not considered successful until a restore test has passed. Never restore production student data into developer laptops.

## Privacy, retention, and access review

Before onboarding real schools, approve Thai-language privacy notices, data-processing roles, retention/deletion periods, subject-access handling, incident response, breach notification, and school offboarding. Review owner/admin/teacher access at least each term. Audit metadata must remain free of passwords, tokens, session cookies, biometric data, and unnecessary student details.

The mobile persisted cache is deliberately limited to timetable, teaching-assignment, coverage, and today-summary reads. It contains no attendance roster or gradebook. Logout, explicit account switching, invalid sessions, and expired sessions clear it. Offline mutations are not queued or replayed silently.
