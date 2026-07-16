import { getTodayTimetable } from "@classroom-os/database";
import { NextRequest } from "next/server";

import { withAuthenticatedApi } from "@/lib/api";

export async function GET(request: NextRequest) {
  return withAuthenticatedApi(request, {}, async ({ context }) =>
    getTodayTimetable({
      schoolId: context.schoolId,
      role: context.role,
      teacherId: context.teacherId,
    }),
  );
}
