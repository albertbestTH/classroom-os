# UAT-SCORE-001 — Quick Score acceptance checklist

## Golden path

1. Sign in as the teacher assigned to the session.
2. Open Live Class and choose Quick Score.
3. Confirm only the enrolled students for the session classroom are shown.
4. Enter valid scores, including `0`, a decimal, and the assessment maximum.
5. Save and confirm success feedback; return to the exact Live Class session.
6. Re-open Quick Score and confirm the saved values remain available.

The Web route resolves the session assessment on the server before rendering. Mobile uses the same session-scoped endpoint and resolves the minimal participation assessment automatically when the session is editable. No separate create-assessment action is required.

## Validation and failure cases

- Negative, over-maximum, malformed, `NaN`, and `Infinity` values are rejected.
- Empty input remains ungraded; it is not converted to zero.
- A failed request keeps the entered values and exposes retryable feedback.
- Repeated save presses do not create duplicate score records.
- While saving, the action shows a loading state and is disabled.
- Navigation occurs only after the authoritative response; cache invalidation runs in the background.

## Parity and authorization

- Save on Web, reopen Quick Score on Mobile, and verify the same server values and Assessment ID.
- Save on Mobile, reopen Quick Score on Web, and verify the same server values and Assessment ID.
- A teacher cannot load or write a roster outside the exact session assignment, school, classroom, or enrollment.
- Completed and cancelled sessions are read-only and do not create or update scores.

## Exact manual tests

1. **Web score entry:** Open Live Class → คะแนนด่วน and confirm the exact enrolled roster appears without a setup action.
2. **Mobile score entry:** Open the same Live Class → คะแนนด่วน and confirm the same roster, Assessment, and maximum appear after loading.
3. **Score zero:** Enter `0`, save, reopen, and confirm it remains `0` rather than empty.
4. **Decimal:** Enter `7.5`, save, reopen, and confirm `7.5` persists.
5. **Maximum:** Enter the exact maximum and confirm it saves.
6. **Over maximum:** Enter a value above the maximum and confirm inline validation prevents saving.
7. **Edit before completion:** Change an existing score during a scheduled/live session and confirm the update persists.
8. **Save → Live Class:** Confirm immediate loading feedback, duplicate Save is disabled, one request succeeds, a success Toast appears, and navigation returns to `/sessions/{sessionId}`.
9. **Reopen → persistence:** Reopen Quick Score and confirm saved scores are loaded while ungraded students remain empty.
10. **Web → Mobile parity:** Save on Web, reopen on Mobile, and confirm the same Assessment ID and scores.
11. **Mobile → Web parity:** Save on Mobile, reopen on Web, and confirm the same Assessment ID and scores.
12. **Network failure:** Fail the save request and confirm the screen stays open, entered values remain, Save is re-enabled, and retry works.
13. **Completed session:** Open a completed or cancelled session and confirm Quick Score is read-only with no create or save action.

## Evidence to record during UAT

- Session ID, teaching assignment ID, and classroom used (synthetic data only).
- Request count for one save, response status, and time from response to navigation.
- Web and Mobile screenshots showing the same student roster and scores.
- Any network or authorization failure; do not include tokens, cookies, or database URLs.

## Future policy

Post-completion score correction belongs to a future Grade Correction / Gradebook policy. UAT-SCORE-001 intentionally keeps completed and cancelled sessions read-only.

## Scope note

Quick Score uses the existing Assessment and Score foundation. This checklist does not cover a full gradebook, weighted grading, publishing, or analytics engine.
