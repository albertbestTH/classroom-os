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
  optionalNumber,
  requiredString,
  withAuthenticatedApi,
} from "@/lib/api";
import { effectiveTeachingContext } from "@/lib/teaching-scope";

export async function GET(request: NextRequest) {
  return withAuthenticatedApi(request, {}, async ({ context, user }) => {
    const teachingContext = effectiveTeachingContext(context, user);
    const classroomId = request.nextUrl.searchParams.get("classroomId") ?? undefined;
    const termId = request.nextUrl.searchParams.get("termId") ?? undefined;
    if (teachingContext.role === "TEACHER") {
      if (!classroomId || !termId) {
        throw domainError(
          "VALIDATION_ERROR",
          "Teachers must select an assigned classroom and term.",
        );
      }
      await requireClassroomAccess(teachingContext, { classroomId, termId });
    } else if (classroomId) {
      await requireClassroomAccess(context, { classroomId, termId });
    }
    return listStudents({
      schoolId: context.schoolId,
      query: request.nextUrl.searchParams.get("query") ?? undefined,
      classroomId,
      termId,
      isActive: request.nextUrl.searchParams.get("isActive") === "all" ? undefined : request.nextUrl.searchParams.get("isActive") === "false" ? false : true,
    });
  });
}

export async function POST(request: NextRequest) {
  return withAuthenticatedApi(
    request,
    { mutation: true, json: true },
    async ({ context, user }, body = {}) => {
      const teachingContext = effectiveTeachingContext(context, user);
      requireRole(context, ["SCHOOL_OWNER", "ADMIN", "TEACHER"]);
      const classroomId = typeof body.classroomId === "string" ? body.classroomId : undefined;
      const termId = typeof body.termId === "string" ? body.termId : undefined;
      if (teachingContext.role === "TEACHER") {
        if (!classroomId || !termId) {
          throw domainError("VALIDATION_ERROR", "กรุณาเลือกห้องเรียนและภาคเรียน");
        }
        await requireClassroomAccess(teachingContext, { classroomId, termId });
      }
      return createStudent(
        trustedTenantInput(context, {
          studentNumber: requiredString(body, "studentNumber"),
          firstName: requiredString(body, "firstName"),
          lastName: requiredString(body, "lastName"),
          preferredName: optionalNullableString(body, "preferredName"),
          dateOfBirth: optionalNullableString(body, "dateOfBirth"),
          isActive: optionalBoolean(body, "isActive"),
          classroomId,
          termId,
          rollNumber: optionalNumber(body, "rollNumber"),
        }),
      );
    },
    201,
  );
}
