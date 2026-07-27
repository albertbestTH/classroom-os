// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { QuickScorePanel } from "@/components/classroom/quick-score-panel";
import { parseScoreInput } from "@/lib/score-input";

const { requestApi } = vi.hoisted(() => ({ requestApi: vi.fn() }));
vi.mock("@/lib/client-api", () => ({ requestApi, thaiApiError: () => "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง" }));

const session = { id: "session-exact", status: "live", classroomId: "class-exact", classroomName: "ม.1/1", subjectName: "วิทยาศาสตร์" } as never;
const assessment = { id: "assessment-exact", classSessionId: "session-exact", maxScore: 10 } as never;
const gradebook = { students: [{ studentId: "student-1", firstName: "สมชาย", lastName: "ใจดี", studentNumber: "001", scores: [] }], assessments: [assessment] } as never;

describe("Web Quick Score", () => {
  beforeEach(() => requestApi.mockReset());
  afterEach(() => cleanup());

  it.each([["", "empty"], ["0", "valid"], ["10", "valid"], ["8.5", "valid"], ["10.1", "invalid"]])("validates %s as %s", (value, kind) => {
    expect(parseScoreInput(value, 10).kind).toBe(kind);
  });

  it("uses the exact session context and saves an explicit decimal score", async () => {
    requestApi.mockResolvedValue({});
    render(<QuickScorePanel session={session} gradebook={gradebook} assessment={assessment} />);
    expect(screen.getByRole("link", { name: /กลับไป Live Class/ }).getAttribute("href")).toBe("/sessions/session-exact");
    fireEvent.change(screen.getByLabelText(/คะแนนของ สมชาย ใจดี/), { target: { value: "8.5" } });
    fireEvent.click(screen.getByRole("button", { name: /บันทึกคะแนน/ }));
    await waitFor(() => expect(requestApi).toHaveBeenCalledWith("/api/assessments/assessment-exact/scores", {
      method: "PUT", body: { classroomId: "class-exact", scores: [{ studentId: "student-1", value: 8.5 }] },
    }));
    await screen.findByRole("status");
  });

  it("keeps invalid persisted values visible and retains input after a failed save", async () => {
    const invalidGradebook = { ...gradebook, students: [{ ...gradebook.students[0], scores: [{ assessmentId: "assessment-exact", value: 12 }] }] } as never;
    const view = render(<QuickScorePanel session={session} gradebook={invalidGradebook} assessment={assessment} />);
    expect(screen.getByDisplayValue("12")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toMatch(/ไม่เกิน 10/);
    view.unmount();
    render(<QuickScorePanel session={session} gradebook={gradebook} assessment={assessment} />);
    requestApi.mockImplementationOnce(async () => { throw new Error("database detail"); });
    const input = screen.getByLabelText(/คะแนนของ สมชาย ใจดี/);
    fireEvent.change(input, { target: { value: "7" } });
    fireEvent.click(screen.getByRole("button", { name: /บันทึกคะแนน/ }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("บันทึกไม่สำเร็จ"));
    expect((input as HTMLInputElement).value).toBe("7");
  });
});
