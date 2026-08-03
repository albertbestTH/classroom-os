import {
  getStudent,
  requireRole,
  requireStudentAccess,
  trustedTenantInput,
  updateStudent,
} from "@classroom-os/database";
import { NextRequest } from "next/server";

import {
  optionalBoolean,
  optionalNullableString,
  optionalNumber,
  optionalString,
  withAuthenticatedApi,
} from "@/lib/api";
import { effectiveTeachingContext } from "@/lib/teaching-scope";

type StudentRouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, route: StudentRouteContext) {
  return withAuthenticatedApi(request, {}, async ({ context, user }) => {
    const teachingContext = effectiveTeachingContext(context, user);
    const { id } = await route.params;
    await requireStudentAccess(teachingContext, id);
    return getStudent({ schoolId: context.schoolId, studentId: id });
  });
}

export async function PATCH(request: NextRequest, route: StudentRouteContext) {
  return withAuthenticatedApi(
    request,
    { mutation: true, json: true },
    async ({ context, user }, body = {}) => {
      requireRole(context, ["SCHOOL_OWNER", "ADMIN"]);
      const { id } = await route.params;
      await requireStudentAccess(effectiveTeachingContext(context, user), id);
      const classroomId = optionalString(body, "classroomId");
      const termId = optionalString(body, "termId");
      return updateStudent(
        trustedTenantInput(context, {
          studentId: id,
          studentNumber: optionalString(body, "studentNumber"),
          firstName: optionalString(body, "firstName"),
          lastName: optionalString(body, "lastName"),
          preferredName: optionalNullableString(body, "preferredName"),
          dateOfBirth: optionalNullableString(body, "dateOfBirth"),
          isActive: optionalBoolean(body, "isActive"),
          classroomId,
          termId,
          rollNumber: optionalNumber(body, "rollNumber"),
        }),
      );
    },
  );
}
