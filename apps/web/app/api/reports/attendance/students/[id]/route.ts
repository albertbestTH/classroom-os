import { getAttendanceStudentReport, requireStudentAccess } from "@classroom-os/database";
import { NextRequest } from "next/server";

import { withAuthenticatedApi } from "@/lib/api";
import { attendanceReportFiltersFromSearchParams } from "@/lib/attendance-report";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, route: RouteContext) {
  return withAuthenticatedApi(request, {}, async ({ context }) => {
    const { id } = await route.params;
    await requireStudentAccess(context, id);
    return getAttendanceStudentReport({
      schoolId: context.schoolId,
      auth: context,
      studentId: id,
      filters: attendanceReportFiltersFromSearchParams(request.nextUrl.searchParams),
    });
  });
}
