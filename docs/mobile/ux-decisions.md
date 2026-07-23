# Teacher Mobile UX decisions

The current or next class stays first on Today. Attendance uses large one-tap status chips and “mark all present.” Destructive completion uses an accessible confirmation sheet.

Today summarizes completed and remaining sessions. My Classes combines timetable and live-class entry points and searches only tenant-scoped API results. Live Class shows elapsed time, attendance progress, events, and status. Completed attendance is read-only.

Light, dark, and system themes use semantic tokens. Text scales, controls meet the 44-point minimum, modal animation honors reduced motion, and feedback uses screen-reader roles or live regions.

Swipe attendance was deferred because it hides choices and reduces screen-reader predictability. Four visible large chips are faster to discover and operate reliably.
