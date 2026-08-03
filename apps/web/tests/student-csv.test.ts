import { describe, expect, it } from "vitest";

import { parseStudentCsv } from "@/lib/student-csv";

describe("student CSV parser", () => {
  it("parses an English header and optional fields", () => {
    const rows = parseStudentCsv([
      "studentNumber,firstName,lastName,preferredName,dateOfBirth",
      "S-001,สมชาย,ใจดี,ชาย,2012-01-15",
    ].join("\n"));

    expect(rows).toEqual([{
      rowNumber: 2,
      studentNumber: "S-001",
      firstName: "สมชาย",
      lastName: "ใจดี",
      preferredName: "ชาย",
      dateOfBirth: "2012-01-15",
      rollNumber: null,
    }]);
  });

  it("accepts a UTF-8 BOM, Thai headers, tab delimiters, and quoted commas", () => {
    const rows = parseStudentCsv([
      "\uFEFFรหัสนักเรียน\tชื่อ\tนามสกุล\tชื่อเล่น",
      'S-002\t"เด็กหญิง,ทดสอบ"\tห้องเรียน\tทดสอบ',
    ].join("\r\n"));

    expect(rows[0]).toMatchObject({
      rowNumber: 2,
      studentNumber: "S-002",
      firstName: "เด็กหญิง,ทดสอบ",
      lastName: "ห้องเรียน",
      preferredName: "ทดสอบ",
    });
  });

  it("parses files without a header using the documented column order", () => {
    expect(parseStudentCsv("S-003,อนันต์,ทดลอง")).toEqual([{
      rowNumber: 1,
      studentNumber: "S-003",
      firstName: "อนันต์",
      lastName: "ทดลอง",
      preferredName: null,
      dateOfBirth: null,
      rollNumber: null,
    }]);
  });

  it("parses a positive classroom roll number from a Thai header", () => {
    expect(parseStudentCsv("เลขที่,รหัสนักเรียน,ชื่อ,นามสกุล\n7,S-007,สมมติ,ทดสอบ"))
      .toEqual([{
        rowNumber: 2,
        rollNumber: 7,
        studentNumber: "S-007",
        firstName: "สมมติ",
        lastName: "ทดสอบ",
        preferredName: null,
        dateOfBirth: null,
      }]);
    expect(() => parseStudentCsv("เลขที่,รหัสนักเรียน,ชื่อ,นามสกุล\n0,S-008,สมมติ,ทดสอบ"))
      .toThrow("เลขที่ต้องเป็นจำนวนเต็มมากกว่า 0");
  });

  it("rejects missing required values and duplicate student numbers", () => {
    expect(() => parseStudentCsv("studentNumber,firstName,lastName\nS-004,สมหญิง,"))
      .toThrow("แถวที่ 2");
    expect(() => parseStudentCsv("S-005,หนึ่ง,ทดสอบ\ns-005,สอง,ทดสอบ"))
      .toThrow("รหัสนักเรียน S-005 ซ้ำกันในไฟล์");
  });

  it("rejects an empty file and imports larger than 100 students", () => {
    expect(() => parseStudentCsv("\n\n")).toThrow("ไฟล์ CSV ไม่มีข้อมูลนักเรียน");
    const rows = Array.from({ length: 101 }, (_, index) => `S-${index},ชื่อ${index},ทดสอบ`).join("\n");
    expect(() => parseStudentCsv(rows)).toThrow("นำเข้าได้ครั้งละไม่เกิน 100 คน");
  });
});
