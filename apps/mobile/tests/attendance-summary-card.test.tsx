import { render } from "@testing-library/react-native";

import { AttendanceSummaryCard } from "@/components/classroom/attendance-summary-card";
import { ThemeProvider } from "@/features/theme/theme-context";
import { summarizeAttendance } from "@/features/attendance/attendance-summary";

describe("AttendanceSummaryCard", () => {
  it("renders distribution text, an unrecorded segment, and a complete accessibility description", async () => {
    const summary = summarizeAttendance({ enrolledCount: 4, students: [{ status: "present" }, { status: "late" }, { status: "absent" }, { status: null }] } as never);
    const screen = await render(<ThemeProvider><AttendanceSummaryCard summary={summary} /></ThemeProvider>);
    expect(screen.getByText("ยังไม่บันทึก")).toBeTruthy();
    expect(screen.getAllByText("25%").length).toBeGreaterThan(0);
    expect(screen.getByText("นักเรียนทั้งหมด")).toBeTruthy();
    expect(screen.queryByText("100%")).toBeNull();
    expect(screen.getByLabelText(/นักเรียนทั้งหมด 4 คน มา 1 คน ร้อยละ 25/)).toBeTruthy();
  });
});
