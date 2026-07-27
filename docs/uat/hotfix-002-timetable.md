# HOTFIX-002 timetable UAT

Use synthetic classroom and teacher data only. Perform these checks in the current term and reload where specified to confirm server persistence.

## Scenario A — Multiple weekly lessons

1. Select one teaching assignment.
2. Add Monday 08:30–09:20, Wednesday 10:30–11:20, and Friday 13:00–13:50.
3. Verify all three cards exist, remain separate, and identify the same assignment.
4. Reload and verify all three remain.

## Scenario B — Same-day non-overlap

1. Add Mathematics Monday 08:30–09:20 and the same assignment Monday 10:30–11:20.
2. Verify both are accepted and sorted chronologically.
3. Optionally verify an adjacent 09:20 start is accepted.

## Scenario C — Actual conflict

1. Add a slot overlapping another class for the same teacher; verify `ครูมีคาบเรียนอื่นในช่วงเวลานี้แล้ว`.
2. Add a slot overlapping another class for the same classroom; verify `ห้องเรียนมีคาบอื่นในช่วงเวลานี้แล้ว`.
3. Repeat an identical assignment/day/time; verify `มีคาบเรียนนี้ในวันและเวลาเดียวกันอยู่แล้ว`.

## Scenario D — Edit

1. Click **แก้ไข** and verify assignment, day, times, and room are populated.
2. Change Wednesday to Thursday and change the time.
3. Click **บันทึกการแก้ไข**.
4. Verify the original card moves immediately and no duplicate remains.
5. Reload and verify persistence.

## Scenario E — Cancel edit

1. Click **แก้ไข**, change values, then click **ยกเลิกการแก้ไข**.
2. Verify no card changes and the edit form closes.
3. Open **เพิ่มคาบเรียน** and verify clean create-mode defaults.
