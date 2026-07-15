import {
  createStudent,
  domainError,
  listStudents,
  requireClassroomAccess,
  requireRole,
  trustedTenantInput,
} from "@classroom-os/database";
import { NextRequest } from "next/server";

import {
  optionalBoolean,
  optionalNullableString,
  requiredString,
  withAuthenticatedApi,
} from "@/lib/api";

export async function GET(request: NextRequest) {
  return withAuthenticatedApi(request, {}, async ({ context }) => {
    const classroomId = request.nextUrl.searchParams.get("classroomId") ?? undefined;
    const termId = request.nextUrl.searchParams.get("termId") ?? undefined;
    if (context.role === "TEACHER") {
      if (!classroomId || !termId) {
        throw domainError(
          "VALIDATION_ERROR",
          "Teachers must select an assigned classroom and term.",
        );
      }
      await requireClassroomAccess(context, { classroomId, termId });
    } else if (classroomId) {
      await requireClassroomAccess(context, { classroomId, termId });
    }
    return listStudents({
      schoolId: context.schoolId,
      query: request.nextUrl.searchParams.get("query") ?? undefined,
      classroomId,
      termId,
      isActive: request.nextUrl.searchParams.get("isActive") === "false" ? false : true,
    });
  });
}

export async function POST(request: NextRequest) {
  return withAuthenticatedApi(
    request,
    { mutation: true, json: true },
    async ({ context }, body = {}) => {
      requireRole(context, ["SCHOOL_OWNER", "ADMIN"]);
      return createStudent(
        trustedTenantInput(context, {
          studentNumber: requiredString(body, "studentNumber"),
          firstName: requiredString(body, "firstName"),
          lastName: requiredString(body, "lastName"),
          preferredName: optionalNullableString(body, "preferredName"),
          dateOfBirth: optionalNullableString(body, "dateOfBirth"),
          isActive: optionalBoolean(body, "isActive"),
        }),
      );
    },
    201,
  );
}
