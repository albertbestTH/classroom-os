// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StudentRecordActions } from "@/components/student-record-actions";

const student = {
  id: "student-1",
  schoolId: "school-1",
  studentNumber: "65001",
  firstName: "สมชาย",
  lastName: "ใจดี",
  preferredName: "ชาย",
  profileImageKey: null,
  dateOfBirth: null,
  isActive: true,
  rollNumber: 5,
};

function success() {
  return new Response(JSON.stringify({ data: student }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("StudentRecordActions", () => {
  it("edits student identity and classroom roll number, then refreshes after confirmation", async () => {
    const onChanged = vi.fn();
    const fetchMock = vi.fn(async () => success());
    vi.stubGlobal("fetch", fetchMock);
    render(<StudentRecordActions
      student={student}
      classroom={{ classroomId: "classroom-1", termId: "term-1", label: "ป.5/2" }}
      onChanged={onChanged}
    />);

    fireEvent.click(screen.getByRole("button", { name: "แก้ไข สมชาย ใจดี" }));
    fireEvent.change(screen.getByLabelText("เลขที่"), { target: { value: "9" } });
    fireEvent.change(screen.getByLabelText("ชื่อ"), { target: { value: "สมหมาย" } });
    fireEvent.click(screen.getByRole("button", { name: "บันทึกการแก้ไข" }));

    await screen.findByText("บันทึกสำเร็จ");
    expect(onChanged).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith("/api/students/student-1", expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({
        studentNumber: "65001",
        firstName: "สมหมาย",
        lastName: "ใจดี",
        preferredName: "ชาย",
        classroomId: "classroom-1",
        termId: "term-1",
        rollNumber: 9,
      }),
    }));

    fireEvent.click(screen.getByRole("button", { name: "ตกลง" }));
    expect(onChanged).toHaveBeenCalledOnce();
  });

  it("soft deletes only after confirmation and preserves the success popup", async () => {
    const onChanged = vi.fn();
    const fetchMock = vi.fn(async () => success());
    vi.stubGlobal("fetch", fetchMock);
    render(<StudentRecordActions student={student} classroom={null} onChanged={onChanged} />);

    fireEvent.click(screen.getByRole("button", { name: "ลบ สมชาย ใจดี" }));
    expect(screen.getByRole("alertdialog").textContent).toContain("ประวัติการเข้าเรียนและคะแนนย้อนหลังจะไม่ถูกลบ");
    fireEvent.click(screen.getByRole("button", { name: "ยืนยันการลบ" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/students/student-1",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ isActive: false }) }),
    ));
    await screen.findByText("ลบออกจากรายชื่อแล้ว");
    expect(onChanged).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "ตกลง" }));
    expect(onChanged).toHaveBeenCalledOnce();
  });
});
