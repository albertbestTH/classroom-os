// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StudentDirectory } from "@/components/student-directory";

function success(data: unknown, status = 200) {
  return new Response(JSON.stringify({ data }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("StudentDirectory CSV import", () => {
  const postedBodies: Array<Record<string, unknown>> = [];

  beforeEach(() => {
    postedBodies.length = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/auth/session") return success({ role: "SCHOOL_OWNER" });
      if (url === "/api/classrooms") {
        return success([
          { id: "classroom-1", name: "ห้อง 2", gradeLevel: "มัธยมศึกษาปีที่ 1" },
          { id: "classroom-2", name: "ห้อง 1", gradeLevel: "มัธยมศึกษาปีที่ 2" },
        ]);
      }
      if (url === "/api/teaching-assignments") return success([]);
      if (url === "/api/terms") return success([{ id: "term-1", isCurrent: true }]);
      if (url.startsWith("/api/students") && init?.method === "POST") {
        postedBodies.push(JSON.parse(String(init.body)) as Record<string, unknown>);
        return success({ id: "student-1" }, 201);
      }
      if (url.startsWith("/api/students")) return success([]);
      return new Response(null, { status: 404 });
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("requires an explicit destination and posts every row to that classroom and term", async () => {
    render(<StudentDirectory />);

    const importButton = await screen.findByRole("button", { name: "นำเข้า CSV" });
    fireEvent.click(importButton);

    const fileInput = screen.getByLabelText("ไฟล์ CSV รายชื่อนักเรียน") as HTMLInputElement;
    expect(fileInput.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("ชั้นเรียนสำหรับนำเข้า CSV"), {
      target: { value: "มัธยมศึกษาปีที่ 1" },
    });
    fireEvent.change(screen.getByLabelText("ห้องเรียนสำหรับนำเข้า CSV"), {
      target: { value: "classroom-1:term-1" },
    });
    expect(fileInput.disabled).toBe(false);

    const file = new File(["studentNumber,firstName,lastName\nCSV-001,เด็กชาย,ทดสอบ"], "students.csv", {
      type: "text/csv",
    });
    Object.defineProperty(file, "text", {
      value: async () => "studentNumber,firstName,lastName\nCSV-001,เด็กชาย,ทดสอบ",
    });
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(await screen.findByText("students.csv")).toBeTruthy();
    expect(postedBodies).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "เริ่มนำเข้า" }));

    await screen.findByText("นำเข้าสำเร็จ 1 คน ไปยัง มัธยมศึกษาปีที่ 1 · ห้อง 2");
    expect(screen.getByRole("dialog").textContent).toContain("นำเข้ารายชื่อนักเรียนสำเร็จ");
    await waitFor(() => expect(postedBodies).toHaveLength(1));
    expect(postedBodies[0]).toMatchObject({
      studentNumber: "CSV-001",
      classroomId: "classroom-1",
      termId: "term-1",
    });
    fireEvent.click(screen.getByRole("button", { name: "ตกลง" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows a failure popup when the selected CSV is invalid", async () => {
    render(<StudentDirectory />);
    fireEvent.click(await screen.findByRole("button", { name: "นำเข้า CSV" }));
    fireEvent.change(screen.getByLabelText("ชั้นเรียนสำหรับนำเข้า CSV"), {
      target: { value: "มัธยมศึกษาปีที่ 1" },
    });
    fireEvent.change(screen.getByLabelText("ห้องเรียนสำหรับนำเข้า CSV"), {
      target: { value: "classroom-1:term-1" },
    });

    const file = new File(["studentNumber,firstName,lastName\nCSV-002,,ทดสอบ"], "invalid.csv", {
      type: "text/csv",
    });
    Object.defineProperty(file, "text", {
      value: async () => "studentNumber,firstName,lastName\nCSV-002,,ทดสอบ",
    });
    fireEvent.change(screen.getByLabelText("ไฟล์ CSV รายชื่อนักเรียน"), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "เริ่มนำเข้า" }));

    expect((await screen.findByRole("dialog")).textContent).toContain("นำเข้าไม่สำเร็จ");
    expect(screen.getByRole("dialog").textContent).toContain("แถวที่ 2");
    expect(postedBodies).toHaveLength(0);
  });

  it("filters room choices by grade without mixing import or create state", async () => {
    render(<StudentDirectory />);
    const gradeFilter = await screen.findByLabelText("ชั้นเรียน");
    const roomFilter = screen.getByLabelText("ห้องเรียน") as HTMLSelectElement;

    expect(Array.from(roomFilter.options, (option) => option.text)).toEqual([
      "ทุกห้องเรียน",
      "ห้อง 2",
      "ห้อง 1",
    ]);
    fireEvent.change(gradeFilter, { target: { value: "มัธยมศึกษาปีที่ 2" } });

    expect(Array.from(roomFilter.options, (option) => option.text)).toEqual(["ห้อง 1"]);
    expect(roomFilter.value).toBe("classroom-2:term-1");
  });
});
