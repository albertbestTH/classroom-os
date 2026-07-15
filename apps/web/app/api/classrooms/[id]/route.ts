import {
  getClassroom,
  requireClassroomAccess,
  requireRole,
  trustedTenantInput,
  updateClassroom,
} from "@classroom-os/database";
import { NextRequest } from "next/server";

import { optionalBoolean, optionalString, withAuthenticatedApi } from "@/lib/api";

type ClassroomRouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, route: ClassroomRouteContext) {
  return withAuthenticatedApi(request, {}, async ({ context }) => {
    const { id } = await route.params;
    await requireClassroomAccess(context, { classroomId: id });
    return getClassroom({ schoolId: context.schoolId, classroomId: id });
  });
}

export async function PATCH(request: NextRequest, route: ClassroomRouteContext) {
  return withAuthenticatedApi(
    request,
    { mutation: true, json: true },
    async ({ context }, body = {}) => {
      requireRole(context, ["SCHOOL_OWNER", "ADMIN"]);
      const { id } = await route.params;
      return updateClassroom(
        trustedTenantInput(context, {
          classroomId: id,
          name: optionalString(body, "name"),
          gradeLevel: optionalString(body, "gradeLevel"),
          isActive: optionalBoolean(body, "isActive"),
        }),
      );
    },
  );
}
