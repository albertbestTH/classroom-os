# Teacher mobile architecture

## Production UI foundation

The app root composes safe-area, theme, persisted-query, and authentication providers. Theme resolution supports light, dark, and system preferences and observes reduced-motion settings. Shared UI primitives own semantic styling and async states; feature screens own orchestration.

Offline support is read-only. Selected teacher queries persist through AsyncStorage, while credentials remain in Expo SecureStore. Server authorization and teaching-assignment isolation remain authoritative. See [offline-strategy.md](offline-strategy.md), [component-catalogue.md](component-catalogue.md), and [ux-decisions.md](ux-decisions.md).

The Expo application in `apps/mobile` is a teacher-only client. Expo Router owns navigation, TanStack Query owns server state, and React context owns only the authenticated session. The app calls the existing Next.js route handlers; it never imports Prisma or the database package.

Mobile authentication uses the same opaque server sessions as web authentication, but transports the raw token in `Authorization: Bearer` instead of a cookie. Only the SHA-256 token hash is stored by PostgreSQL. The device stores the opaque token, expiry, and minimal current-user snapshot in Expo SecureStore with device-only accessibility so cached reads remain available during a network outage. Login, session validation, logout, disabled-account checks, expiry, revocation, school isolation, and teaching-assignment authorization remain server responsibilities.

Reads may retry once after a network failure. Timetable, assignment, coverage, and today-summary queries persist for at most 12 hours so the teacher can still inspect a recent schedule while offline. Roster, attendance, and gradebook queries are not persisted because AsyncStorage is not an encrypted student-data store. Account changes, invalid sessions, expiry, and logout clear the persisted cache. Mutations never retry or queue automatically because attendance, scores, and session transitions require an explicit teacher decision. API errors are mapped to safe Thai messages without exposing database details.

The five tabs are intentionally fixed to วันนี้, ตารางสอน, Live Class, คะแนน, and โปรไฟล์. Classroom cards preserve exact teaching-assignment identity. A live session can create and edit a quick participation assessment; the web gradebook reads the same assessment and score rows. Accepted dated coverage appears in the effective today schedule but retains the original class ownership. There are no admin, student, parent, behavior, biometric, or QR workflows in this release.
