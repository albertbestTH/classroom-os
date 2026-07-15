import {
  domainError,
  listAttendanceForSession,
  requireAttendanceAccess,
  trustedTenantInput,
  updateAttendanceBatch,
} from "@classroom-os/database";
import type { UpdateAttendanceBatchInput } from "@classroom-os/types";
import { NextRequest } from "next/server";

import { requiredArray, requiredString, withAuthenticatedApi } from "@/lib/api";

type AttendanceRouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, route: AttendanceRouteContext) {
  return withAuthenticatedApi(request, {}, async ({ context }) => {
    const { id } = await route.params;
    const classroomId = request.nextUrl.searchParams.get("classroomId");
    if (!classroomId) {
      throw domainError("VALIDATION_ERROR", "classroomId is required.");
    }
    await requireAttendanceAccess(context, { sessionId: id, classroomId });
    return listAttendanceForSession({ schoolId: context.schoolId, sessionId: id });
  });
}

export async function PUT(request: NextRequest, route: AttendanceRouteContext) {
  return withAuthenticatedApi(
    request,
    { mutation: true, json: true },
    async ({ context }, body = {}) => {
      const { id } = await route.params;
      const classroomId = requiredString(body, "classroomId");
      await requireAttendanceAccess(context, { sessionId: id, classroomId });
      return updateAttendanceBatch(
        trustedTenantInput(context, {
          sessionId: id,
          records: requiredArray(body, "records") as UpdateAttendanceBatchInput["records"],
        }),
      );
    },
  );
}
