# Managed PostgreSQL staging

Use PostgreSQL 16 or newer with a database dedicated to this Staging environment. Keep the runtime role least-privileged and use a separate migration role where the provider supports it.

- Store `DATABASE_URL` only in the provider secret store.
- Require TLS/SSL; use the provider's pooled URL for application traffic and a direct/session URL for migrations when required by the provider.
- Apply committed migrations with `prisma migrate deploy`; never create migrations from Staging.
- Validate with `pnpm db:migrate:status` and `pnpm db:verify:uat` after migrations and seed.
- Configure connection limits appropriate to the host's serverless concurrency; do not create a new pool per request.
- Enable encrypted backups, retention, point-in-time recovery where available, and a quarterly restore drill into an isolated database.
- Keep Staging and Production projects, roles, backups, and network policies separate.

The deterministic seed command requires a non-local URL and a staging confirmation. It creates only the `UAT-CLASSROOM-OS` tenant and can be safely replaced with `db:reset:uat` followed by `db:seed:uat`.
