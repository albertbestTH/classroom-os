// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GradebookWorkspace } from "@/components/gradebook/gradebook-workspace";

const { router } = vi.hoisted(() => ({ router: { refresh: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const { requestApi } = vi.hoisted(() => ({ requestApi: vi.fn() }));
vi.mock("@/lib/client-api", () => ({
  requestApi,
  thaiApiError: () => "บันทึกไม่สำเร็จ",
}));

const gradebook = {
  teachingContext: {
    teachingAssignmentId: "assignment-1",
    classroomId: "classroom-1",
    classroomName: "ม.1/1",
    subjectName: "วิทยาศาสตร์",
    termName: "ภาคเรียนที่ 1",
  },
  categories: [{ id: "category-1", name: "ระหว่างเรียน" }],
  assessments: [
    {
      id: "quick-1",
      title: "คะแนนด่วน",
      categoryId: "category-1",
      classSessionId: "session-1",
      assessmentDate: "2026-08-13",
      maxScore: 10,
    },
    {
      id: "work-1",
      title: "ใบงาน",
      categoryId: "category-1",
      classSessionId: null,
      assessmentDate: "2026-08-13",
      maxScore: 10,
    },
  ],
  students: [
    {
      studentId: "student-1",
      studentNumber: "001",
      firstName: "สมชาย",
      lastName: "ใจดี",
      scores: [
        { assessmentId: "quick-1", value: 0 },
        { assessmentId: "work-1", value: null },
      ],
    },
  ],
} as never;

describe("Raw Gradebook UI", () => {
  beforeEach(() => {
    requestApi.mockReset();
    router.refresh.mockReset();
  });
  afterEach(cleanup);

  it("renders a category-grouped spreadsheet and preserves zero versus null", () => {
    render(<GradebookWorkspace assignments={[]} gradebook={gradebook} />);

    expect(screen.getByRole("table", { name: /สมุดคะแนนดิบ/ })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "ระหว่างเรียน" })).toBeTruthy();
    expect(screen.getByDisplayValue("0")).toBeTruthy();
    expect(screen.getByLabelText("ใบงาน ของ สมชาย ใจดี")).toHaveProperty("value", "");
    expect(screen.getByLabelText("ใบงาน ของ สมชาย ใจดี")).toHaveProperty("placeholder", "–");
    expect(screen.queryByRole("columnheader", { name: "เกรด" })).toBeNull();
    expect(screen.queryByText(/รวม.*100|GPA/)).toBeNull();
  });

  it("keeps the four approved views without a global add-assessment action", () => {
    render(<GradebookWorkspace assignments={[]} gradebook={gradebook} />);

    expect(screen.getByRole("tab", { name: "ภาพรวม" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "คะแนนนักเรียน" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: "รายการคะแนน" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "ตั้งค่าคะแนน" })).toBeTruthy();

    expect(screen.queryByRole("button", { name: "+ เพิ่มรายการคะแนน" })).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "รายการคะแนน" }));
    expect(screen.getByRole("tab", { name: "รายการคะแนน" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("heading", { name: "รายการคะแนน" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "นำเข้า CSV" })).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "ตั้งค่าคะแนน" }));
    expect(screen.getByRole("heading", { name: "ตั้งค่าหมวดคะแนน" })).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "ภาพรวม" }));
    expect(screen.getByRole("tabpanel", { name: "ภาพรวมสมุดคะแนน" })).toBeTruthy();
  });

  it("opens assessment details from the column header without an inline edit link", () => {
    render(<GradebookWorkspace assignments={[]} gradebook={gradebook} />);

    expect(screen.queryByRole("button", { name: "แก้ไข" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "เปิดรายละเอียด คะแนนด่วน" }));

    const dialog = screen.getByRole("dialog", { name: "คะแนนด่วน" });
    expect(dialog).toBeTruthy();
    expect(within(dialog).getByLabelText("ชื่อรายการ")).toHaveProperty("value", "คะแนนด่วน");
    expect(within(dialog).getByRole("combobox", { name: "หมวดคะแนน" })).toHaveProperty("value", "category-1");
    expect(within(dialog).getByLabelText("คะแนนเต็ม")).toHaveProperty("value", "10");
    expect(within(dialog).getByLabelText("วันที่")).toHaveProperty("value", "2026-08-13");

    fireEvent.click(screen.getByRole("button", { name: "ปิดแผงรายละเอียด" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("saves only changed cells and clears a raw score with null", async () => {
    requestApi.mockResolvedValue({});
    render(<GradebookWorkspace assignments={[]} gradebook={gradebook} />);

    fireEvent.change(screen.getByLabelText("คะแนนด่วน ของ สมชาย ใจดี"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("ใบงาน ของ สมชาย ใจดี"), {
      target: { value: "8.5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "บันทึกคะแนนที่เปลี่ยน" }));

    await waitFor(() =>
      expect(requestApi).toHaveBeenCalledWith("/api/assessments/quick-1/scores", {
        method: "PUT",
        body: {
          classroomId: "classroom-1",
          scores: [{ studentId: "student-1", value: null }],
        },
      }),
    );
    expect(requestApi).toHaveBeenCalledWith("/api/assessments/work-1/scores", {
      method: "PUT",
      body: {
        classroomId: "classroom-1",
        scores: [{ studentId: "student-1", value: 8.5 }],
      },
    });
  });

  it("previews and imports CSV scores into an existing assessment", async () => {
    requestApi.mockResolvedValue({});
    render(<GradebookWorkspace assignments={[]} gradebook={gradebook} />);

    fireEvent.click(screen.getByRole("tab", { name: "รายการคะแนน" }));
    fireEvent.click(screen.getByRole("button", { name: "นำเข้า CSV" }));
    const file = new File(["studentNumber,score\n001,7.5"], "scores.csv", {
      type: "text/csv",
    });
    Object.defineProperty(file, "text", {
      value: async () => "studentNumber,score\n001,7.5",
    });
    fireEvent.change(screen.getByLabelText("ไฟล์ CSV คะแนนนักเรียน"), {
      target: { files: [file] },
    });

    expect(await screen.findByText("ตรวจพบคะแนนพร้อมนำเข้า 1 คน")).toBeTruthy();
    expect(screen.getByText("7.5")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "นำเข้าคะแนน 1 คน" }));

    await waitFor(() =>
      expect(requestApi).toHaveBeenCalledWith("/api/assessments/quick-1/scores", {
        method: "PUT",
        body: {
          classroomId: "classroom-1",
          scores: [{ studentId: "student-1", value: 7.5 }],
        },
      }),
    );
  });
});
