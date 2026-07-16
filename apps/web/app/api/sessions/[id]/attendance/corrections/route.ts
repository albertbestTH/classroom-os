import {
  correctCompletedAttendance,
  requireAttendanceAccess,
  trustedTenantInput,
} from "@classroom-os/database";
import { ATTENDANCE_STATUSES } from "@classroom-os/types";
import { NextRequest } from "next/server";

import {
  optionalNullableString,
  requiredOneOf,
  requiredString,
  withAuthenticatedApi,
} from "@/lib/api";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, route: RouteContext) {
  return withAuthenticatedApi(
    request,
    { mutation: true, json: true },
    async ({ context }, body = {}) => {
      const { id } = await route.params;
      const classroomId = requiredString(body, "classroomId");
      await requireAttendanceAccess(context, { sessionId: id, classroomId });
      return correctCompletedAttendance({
        ...trustedTenantInput(context, {
          sessionId: id,
          studentId: requiredString(body, "studentId"),
          status: requiredOneOf(body, "status", ATTENDANCE_STATUSES),
          note: optionalNullableString(body, "note"),
          reason: requiredString(body, "reason"),
          expectedRecordUpdatedAt: requiredString(body, "expectedRecordUpdatedAt"),
        }),
        auth: context,
      });
    },
  );
}
