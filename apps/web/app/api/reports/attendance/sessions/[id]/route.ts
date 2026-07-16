import { getAttendanceSessionReport, requireClassSessionAccess } from "@classroom-os/database";
import { NextRequest } from "next/server";

import { withAuthenticatedApi } from "@/lib/api";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, route: RouteContext) {
  return withAuthenticatedApi(request, {}, async ({ context }) => {
    const { id } = await route.params;
    await requireClassSessionAccess(context, id);
    return getAttendanceSessionReport({
      schoolId: context.schoolId,
      auth: context,
      sessionId: id,
    });
  });
}
