import { attendanceSessionPath, attendanceSummaryPath } from "@/features/attendance/attendance-navigation";
import { invalidateSessionWorkflow } from "@/lib/query-keys";

const { readFileSync } = jest.requireActual("node:fs") as { readFileSync(path: string, encoding: string): string };
const { resolve } = jest.requireActual("node:path") as { resolve(...paths: string[]): string };
const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("teacher workflow hotfix", () => {
  it("uses deterministic session routes for normal and deep-link attendance entry", () => {
    expect(attendanceSessionPath("session-exact")).toBe("/sessions/session-exact");
    expect(attendanceSummaryPath("session-exact")).toBe("/sessions/session-exact/summary");
  });

  it("keeps the unsaved guard and returns only after a successful save", () => {
    const attendance = source("features/attendance/attendance-screen.tsx");
    expect(attendance).toContain("hardwareBackPress");
    expect(attendance).toContain("if (changed > 0) setExitOpen(true)");
    expect(attendance).toContain("memoryDrafts.delete(sessionId)");
    expect(attendance).toContain("setDraft({})");
    expect(attendance).toContain("queryClient.setQueryData(queryKeys.attendanceSaveFeedback(sessionId), true)");
    expect(attendance).toContain("router.replace(attendanceSessionPath(sessionId))");
    const successBlock = attendance.slice(attendance.indexOf("onSuccess"));
    expect(successBlock.indexOf("onSuccess")).toBeLessThan(successBlock.indexOf("router.replace(attendanceSessionPath(sessionId))"));
    expect(attendance).toContain("saveRequested.current");
    expect(attendance).toContain("scrollToOffset({ offset: 0, animated: true })");
    expect(attendance).toContain('accessibilityLabel="กลับขึ้นด้านบน"');
    expect(attendance).toContain("ListFooterComponent={footer}");
    expect(attendance).not.toContain('position: "fixed"');
    expect(attendance).not.toContain('position: "sticky"');
  });

  it("keeps numeric keyboard and focus props on the native score input", () => {
    const scores = source("features/scores/score-input-field.tsx");
    expect(scores).toContain('keyboardType="decimal-pad"');
    expect(scores).toContain('inputMode="decimal"');
    expect(scores).toContain("showSoftInputOnFocus");
    expect(scores).toContain("localInputRef.current?.focus()");
    expect(source("features/scores/quick-score-screen.tsx")).toContain("scoreInputs.current[nextStudent.studentId]?.focus()");
  });

  it("resolves the session score column and navigates only after a successful save", () => {
    const scores = source("features/scores/quick-score-screen.tsx");
    expect(scores).toContain('method: "POST"');
    expect(scores).toContain("resolveAssessment.mutate()");
    expect(scores).toContain("queryKeys.scoreSaveFeedback(sessionId)");
    expect(scores).toContain("void invalidateScoreWorkflow(queryClient, teachingAssignmentId, sessionId)");
    expect(scores).toContain("router.replace(`/sessions/${sessionId}?scoreSaved=1`)");
    expect(scores).toContain("disabled={!isOnline || save.isPending || dirty.size === 0 || hasInvalidScore}");
    expect(scores).toContain("saveRequested.current");
    expect(scores).toContain("onPress={submitScores}");
    expect(scores).toContain("setValues({})");
    expect(scores).toContain("setDirty(new Set())");
    expect(scores).toContain("onSuccess: () => {\n      saveRequested.current = false;");
    const session = source("features/sessions/session-screen.tsx");
    expect(session).toContain('scoreSavedParam === "1"');
    expect(session).toContain("router.setParams({ scoreSaved: undefined })");
    expect(session.indexOf('message="บันทึกคะแนนเรียบร้อยแล้ว"')).toBeLessThan(session.indexOf("<AppHeader"));
    expect(session).toContain("useFocusEffect");
    expect(session).toContain("queryKeys.scoreSaveFeedback(id)");
  });

  it("invalidates all session workflow query roots", async () => {
    const invalidated: unknown[][] = [];
    const client = { invalidateQueries: jest.fn(({ queryKey }) => { invalidated.push(queryKey); return Promise.resolve(); }) };
    await invalidateSessionWorkflow(client as never, "session-1");
    expect(invalidated).toEqual(expect.arrayContaining([
      ["session", "session-1"], ["attendance", "session-1"], ["timeline", "session-1"],
      ["today"], ["timetable"], ["assignments"],
    ]));
  });

  it("navigates to summary only after server-confirmed completion", () => {
    const session = source("features/sessions/session-screen.tsx");
    expect(session).toContain('completed.status !== "completed"');
    expect(session.indexOf("onSuccess")).toBeLessThan(session.indexOf("router.replace(`/sessions/${id}/summary`)"));
  });
});
