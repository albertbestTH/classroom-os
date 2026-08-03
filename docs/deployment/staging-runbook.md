# Staging runbook

## Prepare

```powershell
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:migrate:deploy
```

Set `CLASSROOM_OS_ENV=staging`, `UAT_SEED_CONFIRM=CLASSROOM-OS-UAT`, `DATABASE_URL`, `UAT_MANAGER_PASSWORD`, and five `UAT_TEACHER_PASSWORD_01`…`05` values in the controlled deployment shell. Then run the package scripts directly if root aliases are unavailable:

```powershell
pnpm --filter @classroom-os/database exec tsx scripts/seed-uat.ts
pnpm --filter @classroom-os/database exec tsx scripts/verify-uat.ts
```

Print only the safe account identifiers from the seed output. Deliver passwords through a separate secure channel.

## Verify and operate

Check `/api/health`, run [golden-path.md](../uat/golden-path.md), inspect provider logs without request bodies/cookies/tokens, and confirm assignment-scoped rosters. Disable a tester in the admin UI to revoke sessions. Rotate a leaked test password immediately and re-run the smoke flow.

## Reset/rollback

Snapshot first. Run `pnpm --filter @classroom-os/database exec tsx scripts/reset-uat.ts`, then seed again. Never run these commands against localhost or Production. Roll back the Web deployment only after checking migration compatibility; restore the database only into an isolated environment unless an incident owner approves otherwise.
