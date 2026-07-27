# Teacher mobile workflows

## Sign in and resume

The teacher signs in with the school account. At startup, a stored session is validated with the server before protected screens render. Expired, revoked, disabled, or non-teacher sessions return to sign-in. Logout revokes the server session and clears local state.

## Today and class session

Today shows the live class first, then the next class and the current schedule. Starting a scheduled item materializes its dated occurrence and performs the allowed `scheduled → live` transition. A live class can be resumed. Ending requires confirmation; only `live → completed` is allowed, and incomplete attendance is called out before confirmation.

## Attendance

The roster is limited to actively enrolled students in the session classroom. A teacher selects individual statuses or explicitly chooses mark-all-present. Unsaved selections stay in memory and are sent only after Save; unchanged and unselected students are never implicitly marked present. Completed sessions are read-only in the teacher app. Mutations are not retried silently.

After the server confirms a successful save, the draft and dirty state are cleared, all related queries are invalidated, and the app automatically replaces the route with the exact Live Class session. A brief success message appears there. Failed saves remain on the attendance editor, and a synchronous guard prevents duplicate submissions. Live Class and Session Summary calculate the same present, late, leave, absent, recorded, and enrolled breakdown from the authorized server roster; unrecorded students are never counted as present. The Live Class action changes from **เช็กชื่อ** to **เช็กชื่อต่อ** and then **✓ เช็กชื่อแล้ว** as the authorized roster progresses.

## Classes and scores

Classes remain separate by teaching assignment, term, classroom, and subject even when labels repeat. The score area exposes only available teaching contexts until the backend offers the complete authorized score view needed for production editing.

Quick participation scores use the native decimal keyboard and preserve an empty/ungraded value. The client rejects malformed, negative, non-finite, and over-maximum values before mutation while the existing service remains authoritative. Persisted invalid legacy values remain visible with an error and must be corrected before saving.

Mobile displays LIVE only after the start API returns the canonical LIVE session. Start, end, attendance save, timetable coverage, and quick-score saves invalidate only related operational queries. Attendance summary separates recording completion from distribution: the ring accounts for the full enrolled roster, includes a neutral **ยังไม่บันทึก** segment for partial work, and shows total students in its center rather than a misleading completion percentage.
