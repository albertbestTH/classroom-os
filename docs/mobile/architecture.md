# Teacher mobile architecture

The Expo application in `apps/mobile` is a teacher-only client. Expo Router owns navigation, TanStack Query owns server state, and React context owns only the authenticated session. The app calls the existing Next.js route handlers; it never imports Prisma or the database package.

Mobile authentication uses the same opaque server sessions as web authentication, but transports the raw token in `Authorization: Bearer` instead of a cookie. Only the SHA-256 token hash is stored by PostgreSQL. The device stores only the opaque token and expiry in Expo SecureStore with device-only accessibility. Login, session validation, logout, disabled-account checks, expiry, revocation, school isolation, and teaching-assignment authorization remain server responsibilities.

Reads may retry once after a network failure. Mutations never retry automatically because attendance and session transitions require an explicit teacher decision. API errors are mapped to safe Thai messages without exposing database details. React Query cache and SecureStore are cleared at logout.

The five tabs are intentionally fixed to วันนี้, ชั้นเรียน, Live Class, คะแนน, and โปรไฟล์. Classroom cards preserve exact teaching-assignment identity. The scores tab is a truthful foundation until a complete teacher score-query API exists; it does not invent values. There are no admin, student, parent, homework, behavior, biometric, or QR workflows in this release.
