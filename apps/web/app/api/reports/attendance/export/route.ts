import { createAttendanceReportCsv, getAttendanceReport } from "@classroom-os/database";
import { NextRequest, NextResponse } from "next/server";

import { apiError, requireApiSession } from "@/lib/api";
import { attendanceReportFiltersFromSearchParams } from "@/lib/attendance-report";

export async function GET(request: NextRequest) {
  try {
    const { context } = await requireApiSession(request);
    const report = await getAttendanceReport({
      schoolId: context.schoolId,
      auth: context,
      filters: attendanceReportFiltersFromSearchParams(request.nextUrl.searchParams),
    });
    const filename = `attendance-report-${report.from}-to-${report.to}.csv`;
    return new NextResponse(createAttendanceReportCsv(report), {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": "text/csv; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
