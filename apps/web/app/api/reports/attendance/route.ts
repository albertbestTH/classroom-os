import { getAttendanceReport } from "@classroom-os/database";
import { NextRequest } from "next/server";

import { withAuthenticatedApi } from "@/lib/api";
import { attendanceReportFiltersFromSearchParams } from "@/lib/attendance-report";

export async function GET(request: NextRequest) {
  return withAuthenticatedApi(request, {}, async ({ context }) =>
    getAttendanceReport({
      schoolId: context.schoolId,
      auth: context,
      filters: attendanceReportFiltersFromSearchParams(request.nextUrl.searchParams),
    }),
  );
}
