import { formatTimetableTime } from "@/lib/time";

describe("formatTimetableTime", () => {
  it.each([
    ["08:30", "08:30"],
    ["08:30:00", "08:30"],
    ["1970-01-01T08:30:00.000Z", "08:30"],
  ])("formats %s as %s", (value, expected) => {
    expect(formatTimetableTime(value)).toBe(expected);
  });

  it("preserves an unrecognized value for safe display", () => {
    expect(formatTimetableTime("เวลาไม่พร้อมใช้งาน")).toBe("เวลาไม่พร้อมใช้งาน");
  });
});
