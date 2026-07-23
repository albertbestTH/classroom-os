# Teacher Mobile offline-read strategy

Teacher Mobile is read-capable, not mutation-capable, while offline.

Successful Today, timetable, teaching assignment, classroom, coverage, and profile queries persist locally for 12 hours. The offline banner identifies cached content and its last update time. Reconnection refreshes stale reads.

The opaque session token and minimal current-user snapshot use device-only secure storage. A valid, unexpired session may open cached teacher views during a network outage. An authorization failure clears session and cache; a network or timeout failure does not.

Attendance saves, session lifecycle actions, profile updates, and all other mutations require connectivity. The app never queues or invents server actions. Student rosters and attendance drafts are excluded from persisted query storage to reduce sensitive local data and avoid write conflicts.
