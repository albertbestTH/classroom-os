# HOTFIX-003 cross-platform UAT

Use synthetic classroom data only. Keep Web and Mobile signed in to authorized users in the same tenant and teaching context.

## A. Start session sync

1. Open the Web dashboard and Mobile Today.
2. Start a scheduled class on Mobile.
3. Confirm Mobile shows LIVE only after the server responds.
4. Confirm Web updates within 10 seconds, and immediately after refocusing the browser.

## B. End session sync

1. Keep the exact Web Live Class page open.
2. End the class on Mobile.
3. Confirm Web changes to completed within 10 seconds and polling stops.

## C. Timetable Web to Mobile

1. Edit a timetable slot on Web.
2. Return Mobile from background to foreground.
3. Confirm Today and Timetable show the canonical updated slot.
4. Repeat with pull-to-refresh.

## D. Reconnect

1. Load Mobile online, then disconnect it.
2. Edit the timetable on Web.
3. Confirm cached Mobile data remains usable offline.
4. Reconnect and confirm operational queries refresh once.

## E. Web Quick Score

1. Open a LIVE session and select **คะแนนด่วน**.
2. Confirm the roster and assessment belong to the exact session and teaching assignment.
3. Test zero, decimal, maximum, over-maximum, and empty values.
4. Confirm only explicit valid changes save, failed saves retain input, and the return link opens the exact Live Class.

## F. Attendance distribution

1. Record a mixed and then a partial attendance set.
2. Confirm Mobile and Web show matching counts and percentages.
3. Confirm unrecorded students appear separately and are never counted as present.
4. Confirm the donut center shows total enrollment, completion is separate, zero enrollment is safe, and screen-reader text contains all values.
