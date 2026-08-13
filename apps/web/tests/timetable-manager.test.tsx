// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { TeachingAssignmentResult, TimetableEntryResult } from "@classroom-os/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TimetableManager } from "@/components/classroom/timetable-manager";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const assignment: TeachingAssignmentResult = {
  id: "assignment-1", schoolId: "school-1", userId: "user-1", teacherId: "teacher-1",
  academicYearId: "year-1", termId: "term-1", classroomId: "classroom-1", subjectId: "subject-1",
  teacherName: "ครูทดสอบ", classroomName: "ม.1/1", subjectCode: "MATH", subjectName: "คณิตศาสตร์",
  termName: "ภาคเรียน 1", academicYearName: "2569", createdAt: "2026-01-01T00:00:00Z",
};
const entry: TimetableEntryResult = {
  id: "entry-1", schoolId: "school-1", termId: "term-1", teachingAssignmentId: assignment.id,
  teacherId: assignment.teacherId, classroomId: assignment.classroomId, subjectId: assignment.subjectId,
  weekday: 3, startTime: "10:30", endTime: "11:20", room: "401", isActive: true,
  teacherName: assignment.teacherName, classroomName: assignment.classroomName, subjectCode: assignment.subjectCode,
  subjectName: assignment.subjectName, termName: assignment.termName, academicYearName: assignment.academicYearName,
};

function success(data: TimetableEntryResult) { return Promise.resolve(new Response(JSON.stringify({ data }), { status: 200, headers: { "content-type": "application/json" } })); }

describe("TimetableManager edit workflow", () => {
  beforeEach(() => {
    refresh.mockReset();
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("reveals the edit form and moves focus to its heading", async () => {
    render(<TimetableManager entries={[entry]} assignments={[assignment]} role="ADMIN" />);

    const editButton = document.querySelector<HTMLButtonElement>("article button[type='button']");
    expect(editButton).not.toBeNull();
    fireEvent.click(editButton!);

    await waitFor(() => expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" }));
    const formTitle = document.querySelector<HTMLElement>("[id$='-form-title']");
    expect(formTitle).not.toBeNull();
    expect(document.activeElement).toBe(formTitle);
  });

  it("prefills edit fields, PATCHes the record, and refreshes the visible card", async () => {
    vi.mocked(fetch).mockImplementation(async () => success({ ...entry, weekday: 4, startTime: "12:30", endTime: "13:20" }));
    render(<TimetableManager entries={[entry]} assignments={[assignment]} role="ADMIN" />);
    fireEvent.click(screen.getByRole("button", { name: "แก้ไข" }));
    expect(screen.getByRole("heading", { name: "แก้ไขคาบเรียน" })).toBeTruthy();
    expect((screen.getByLabelText("งานสอน") as HTMLSelectElement).value).toBe(assignment.id);
    expect((screen.getByLabelText("วัน") as HTMLSelectElement).value).toBe("3");
    expect((screen.getByLabelText("เวลาเริ่ม") as HTMLInputElement).value).toBe("10:30");
    expect((screen.getByLabelText("เวลาสิ้นสุด") as HTMLInputElement).value).toBe("11:20");
    expect((screen.getByLabelText("ห้อง") as HTMLInputElement).value).toBe("401");
    fireEvent.change(screen.getByLabelText("วัน"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("เวลาเริ่ม"), { target: { value: "12:30" } });
    fireEvent.change(screen.getByLabelText("เวลาสิ้นสุด"), { target: { value: "13:20" } });
    fireEvent.click(screen.getByRole("button", { name: "บันทึกการแก้ไข" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe("/api/timetable/entry-1");
    expect(vi.mocked(fetch).mock.calls[0]?.[1]).toMatchObject({ method: "PATCH" });
    await screen.findByText("บันทึกการแก้ไขคาบเรียนแล้ว");
    expect(screen.getByText("12:30–13:20")).toBeTruthy();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("retains controlled edit values and displays a specific error after failure", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ error: { code: "CONFLICT", message: "The teacher already has an overlapping timetable entry." } }), { status: 409 }));
    render(<TimetableManager entries={[entry]} assignments={[assignment]} role="ADMIN" />);
    fireEvent.click(screen.getByRole("button", { name: "แก้ไข" }));
    fireEvent.change(screen.getByLabelText("เวลาเริ่ม"), { target: { value: "10:45" } });
    fireEvent.click(screen.getByRole("button", { name: "บันทึกการแก้ไข" }));
    expect((await screen.findByRole("alert")).textContent).toContain("ครูมีคาบเรียนอื่นในช่วงเวลานี้แล้ว");
    expect((screen.getByLabelText("เวลาเริ่ม") as HTMLInputElement).value).toBe("10:45");
    expect(screen.getByRole("heading", { name: "แก้ไขคาบเรียน" })).toBeTruthy();
  });

  it("cancels edit cleanly and the create form still POSTs a new slot", async () => {
    const created = { ...entry, id: "entry-2", weekday: 5, startTime: "13:00", endTime: "13:50" };
    vi.mocked(fetch).mockImplementation(async () => success(created));
    render(<TimetableManager entries={[entry]} assignments={[assignment]} role="ADMIN" />);
    fireEvent.click(screen.getByRole("button", { name: "แก้ไข" }));
    fireEvent.change(screen.getByLabelText("ห้อง"), { target: { value: "ใหม่" } });
    fireEvent.click(screen.getByRole("button", { name: "ยกเลิกการแก้ไข" }));
    expect(screen.queryByRole("heading", { name: "แก้ไขคาบเรียน" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "+ เพิ่มคาบเรียน" }));
    expect(screen.getByRole("heading", { name: "เพิ่มคาบเรียน" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("งานสอน"), { target: { value: assignment.id } });
    fireEvent.change(screen.getByLabelText("วัน"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("เวลาเริ่ม"), { target: { value: "13:00" } });
    fireEvent.change(screen.getByLabelText("เวลาสิ้นสุด"), { target: { value: "13:50" } });
    fireEvent.click(screen.getByRole("button", { name: "บันทึกคาบเรียน" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe("/api/timetable");
    expect(vi.mocked(fetch).mock.calls[0]?.[1]).toMatchObject({ method: "POST" });
  });
});
