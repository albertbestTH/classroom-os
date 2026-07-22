import { getTodayTimetable } from "@classroom-os/database";
import { NextRequest } from "next/server";

import { withAuthenticatedApi } from "@/lib/api";

export async function GET(request: NextRequest) {
  return withAuthenticatedApi(request, {}, async ({ context, user }) =>
    getTodayTimetable({
      schoolId: context.schoolId,
      role: user.workspaceType === "PERSONAL" ? "TEACHER" : context.role,
      teacherId: context.teacherId,
    }),
  );
}
