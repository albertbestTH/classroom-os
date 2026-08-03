# Staging environment contract

Values below are examples only. Do not copy secrets into Git or send them through chat.

| Variable | Required | Scope | Staging use |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | server/migration secret | Managed PostgreSQL 16+ URL; separate from local and production. |
| `CLASSROOM_OS_ENV` | seed/ops | server-only label | Set to `staging` for UAT scripts and deployment checks. |
| `UAT_SEED_CONFIRM` | seed/ops | server-only guard | Exact value `CLASSROOM-OS-UAT`; prevents accidental resets. |
| `UAT_MANAGER_PASSWORD` | seed runtime | secret | Supplied only at seed time; never committed or logged. |
| `UAT_TEACHER_PASSWORD_01`…`05` | seed runtime | secret | One password per synthetic teacher account; never committed or logged. |
| `AUTH_LOGIN_RATE_LIMIT_MAX` | optional | server-only | Per-instance login limiter override; use a shared atomic store for multiple instances. |
| `AUTH_LOGIN_RATE_LIMIT_WINDOW_MS` | optional | server-only | Login limiter window in milliseconds. |
| `AUTH_LOGIN_RATE_LIMIT_MAX_BUCKETS` | optional | server-only | Maximum in-memory limiter buckets. |
| `EXPO_PUBLIC_API_BASE_URL` | yes for APK | public client | HTTPS Staging API origin, for example `https://staging.example.invalid`; configure through EAS, never hardcode. |
| `EXPO_PUBLIC_ENV_LABEL` | yes for non-production APK | public client | `UAT` so testers can identify the build. |
| `NEXT_PUBLIC_SITE_URL` | if used by a host | public client/server | Staging HTTPS origin for absolute links; inspect host requirements before setting. |

The repository currently has no SMTP, object-storage, or server session-secret variables. Password sessions are persisted in PostgreSQL and web cookies become `Secure` when `NODE_ENV=production`. Do not invent a server-side `EXPO_PUBLIC_*` secret. Missing `DATABASE_URL` and missing mobile API URL fail clearly at runtime.

Development uses `packages/database/.env` and `apps/mobile/.env`, both ignored. Staging and Production must use provider secret stores. Never use local Docker credentials in a hosted environment.
