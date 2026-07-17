# Teacher mobile workflows

## Sign in and resume

The teacher signs in with the school account. At startup, a stored session is validated with the server before protected screens render. Expired, revoked, disabled, or non-teacher sessions return to sign-in. Logout revokes the server session and clears local state.

## Today and class session

Today shows the live class first, then the next class and the current schedule. Starting a scheduled item materializes its dated occurrence and performs the allowed `scheduled → live` transition. A live class can be resumed. Ending requires confirmation; only `live → completed` is allowed, and incomplete attendance is called out before confirmation.

## Attendance

The roster is limited to actively enrolled students in the session classroom. A teacher selects individual statuses or explicitly chooses mark-all-present. Unsaved selections stay in memory and are sent only after Save; unchanged and unselected students are never implicitly marked present. Completed sessions are read-only in the teacher app. Mutations are not retried silently.

## Classes and scores

Classes remain separate by teaching assignment, term, classroom, and subject even when labels repeat. The score area exposes only available teaching contexts until the backend offers the complete authorized score view needed for production editing.
