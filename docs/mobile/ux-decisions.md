# Teacher Mobile UX decisions

The current or next class stays first on Today. Attendance uses large one-tap status chips and “mark all present.” Destructive completion uses an accessible confirmation sheet.

Today summarizes completed and remaining sessions. My Classes combines timetable and live-class entry points and searches only tenant-scoped API results. Live Class shows elapsed time, attendance progress, events, and status. Completed attendance is read-only.

Light, dark, and system themes use semantic tokens. Text scales, controls meet the 44-point minimum, modal animation honors reduced motion, and feedback uses screen-reader roles or live regions.

Swipe attendance was deferred because it hides choices and reduces screen-reader predictability. Four visible large chips are faster to discover and operate reliably.

## Production-hardening details

- Today pins the active class at the top while scrolling, groups the schedule into morning and afternoon, and uses an ordered status timeline.
- Classes supports day/week modes plus All, Today, Upcoming, and Completed filters. Academic year, current term, teacher, assignment, and student-count context remain visible without exposing another teacher's data.
- Live Class shows both elapsed time and remaining scheduled time. The remaining value stops at zero rather than implying that the session ends automatically.
- Attendance virtualizes the roster, memoizes rows, keeps all four status choices visible, and provides a long-press status sheet as an additional shortcut. No correctness-critical action depends on the gesture.
- Profile reads its own cached account and assignment context. Profile edits, attendance saves, score saves, and session lifecycle actions remain disabled while offline.
