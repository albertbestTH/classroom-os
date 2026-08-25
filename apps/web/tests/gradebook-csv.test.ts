import { describe, expect, it } from "vitest";

import { parseGradebookScoreCsv } from "@/lib/gradebook-csv";

const students = [
  { studentId: "student-1", studentNumber: "001", displayName: "สมชาย ใจดี" },
  { studentId: "student-2", studentNumber: "002", displayName: "สมหญิง ทดสอบ" },
];

describe("Gradebook score CSV", () => {
  it("supports English and Thai headers, decimals, zero, and blank rows", () => {
    expect(parseGradebookScoreCsv("studentNumber,score\n001,0\n002,8.5", students, 10)).toEqual([
      { studentId: "student-1", studentNumber: "001", displayName: "สมชาย ใจดี", value: 0 },
      { studentId: "student-2", studentNumber: "002", displayName: "สมหญิง ทดสอบ", value: 8.5 },
    ]);
    expect(parseGradebookScoreCsv("รหัสนักเรียน,คะแนน\n001,7\n002,", students, 10)).toEqual([
      { studentId: "student-1", studentNumber: "001", displayName: "สมชาย ใจดี", value: 7 },
    ]);
  });

  it("rejects duplicate student numbers", () => {
    expect(() => parseGradebookScoreCsv("studentNumber,score\n001,5\n001,6", students, 10)).toThrow("รหัสนักเรียน 001 ซ้ำ");
  });

  it("rejects students outside the selected classroom", () => {
    expect(() => parseGradebookScoreCsv("studentNumber,score\n999,5", students, 10)).toThrow("ไม่พบนักเรียนรหัส 999");
  });

  it("rejects negative and over-max scores", () => {
    expect(() => parseGradebookScoreCsv("studentNumber,score\n001,-1", students, 10)).toThrow("ต้องอยู่ระหว่าง 0 ถึง 10");
    expect(() => parseGradebookScoreCsv("studentNumber,score\n001,10.01", students, 10)).toThrow("ต้องอยู่ระหว่าง 0 ถึง 10");
  });
});
