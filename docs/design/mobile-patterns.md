# Mobile Patterns

Mobile is the teacher’s daily command center, not a compressed desktop dashboard.

## Golden screen hierarchy

Today: greeting/date → current or next class hero → primary action → daily progress → timeline → alerts.

Live Class: live identity/timer → primary actions → attendance dashboard → timeline → destructive end confirmation.

Attendance: deterministic back action → search/tools → roster → sticky save action. Bulk changes remain local until Save and require confirmation when mixed statuses would be overwritten.

## Interaction rules

- Use one dominant action per context.
- Keep important actions reachable with one hand.
- Show pressed and loading states immediately.
- Do not await unrelated refetches before navigating after a successful mutation.
- Keep server-authoritative failures visible and preserve unsaved drafts.

## State rules

Every screen has loading, empty, error, offline, and permission/no-context states where applicable. Cached offline views are read-only; attendance and score mutations never queue automatically.
