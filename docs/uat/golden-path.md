# UAT golden path

Automated API and browser suites already cover health-adjacent authenticated routes, login, Today, exact teaching scope, start, attendance, end, and logout. For a hosted environment, run this manual smoke flow with synthetic accounts:

1. `GET /api/health` returns ready.
2. Teacher logs in on Web and the Android UAT APK.
3. Teacher opens Today and the next assigned class.
4. Start the scheduled session, record attendance, set one learner Late and one Leave, save, and confirm the Live Class dashboard.
5. End the session and open its summary.
6. Open the next day's timetable, edit the teacher profile, and log out.

Record a defect when an action takes more than five seconds, shows a wrong classroom/student scope, loses a pending change, or exposes an internal error. Use [defect-template.md](defect-template.md) and synthetic identifiers only. Maestro is optional on Windows; the existing flow is `pnpm --filter mobile e2e:android` with externally supplied `MAESTRO_TEST_EMAIL` and `MAESTRO_TEST_PASSWORD`.
