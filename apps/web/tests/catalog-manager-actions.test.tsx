// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ClassroomManager } from "@/components/admin/classroom-manager";
import { SubjectManager } from "@/components/admin/subject-manager";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const classroom = {
  id: "classroom-1",
  schoolId: "school-1",
  code: "M1-1",
  name: "มัธยมศึกษาปีที่ 1/1",
  gradeLevel: "ม.1",
  homeroomTeacherId: null,
  isActive: true,
  studentCount: 0,
  teachingAssignmentCount: 0,
};

const subject = {
  id: "subject-1",
  schoolId: "school-1",
  code: "MATH",
  name: "คณิตศาสตร์",
  isActive: true,
  createdAt: "2026-08-03T00:00:00.000Z",
  updatedAt: "2026-08-03T00:00:00.000Z",
};

function success(data: object) {
  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  cleanup();
  refresh.mockClear();
  vi.unstubAllGlobals();
});

describe("catalog manager destructive actions", () => {
  it("confirms before deleting a classroom and reports success", async () => {
    const fetchMock = vi.fn(async () => success(classroom));
    vi.stubGlobal("fetch", fetchMock);
    render(<ClassroomManager classrooms={[classroom]} />);

    fireEvent.click(screen.getByRole("button", { name: `ลบ ${classroom.name}` }));
    expect(screen.getByRole("alertdialog").textContent).toContain("ลบชั้นเรียนนี้?");
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "ยืนยันการลบ" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/classrooms/classroom-1",
      expect.objectContaining({ method: "DELETE" }),
    ));
    expect(await screen.findByText("ลบชั้นเรียนสำเร็จ")).toBeTruthy();
  });

  it("reports successful classroom edits in a popup", async () => {
    const fetchMock = vi.fn(async () => success(classroom));
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(window, "scrollTo", { configurable: true, value: vi.fn() });
    render(<ClassroomManager classrooms={[classroom]} />);

    fireEvent.click(screen.getByRole("button", { name: `แก้ไข ${classroom.name}` }));
    fireEvent.click(screen.getByRole("button", { name: "บันทึกการแก้ไข" }));

    expect(await screen.findByText("แก้ไขสำเร็จ")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/classrooms/classroom-1",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("confirms subject deletion and reports successful subject edits", async () => {
    const fetchMock = vi.fn(async () => success(subject));
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(window, "scrollTo", { configurable: true, value: vi.fn() });
    const { unmount } = render(<SubjectManager subjects={[subject]} />);

    fireEvent.click(screen.getByRole("button", { name: `ลบ ${subject.name}` }));
    expect(screen.getByRole("alertdialog").textContent).toContain("ลบรายวิชานี้?");
    fireEvent.click(screen.getByRole("button", { name: "ยืนยันการลบ" }));
    expect(await screen.findByText("ลบรายวิชาสำเร็จ")).toBeTruthy();
    unmount();

    render(<SubjectManager subjects={[subject]} />);
    fireEvent.click(screen.getByRole("button", { name: `แก้ไข ${subject.name}` }));
    fireEvent.click(screen.getByRole("button", { name: "บันทึกการแก้ไข" }));
    expect(await screen.findByText("แก้ไขสำเร็จ")).toBeTruthy();
  });
});
