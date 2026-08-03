import {
  createClassroom,
  listClassrooms,
  requireRole,
  trustedTenantInput,
} from "@classroom-os/database";
import { NextRequest } from "next/server";

import { optionalBoolean, requiredString, withAuthenticatedApi } from "@/lib/api";
import { effectiveTeachingContext } from "@/lib/teaching-scope";

export async function GET(request: NextRequest) {
  return withAuthenticatedApi(request, {}, async ({ context, user }) => {
    const teachingContext = effectiveTeachingContext(context, user);
    return listClassrooms({
      schoolId: context.schoolId,
      isActive: request.nextUrl.searchParams.get("isActive") === "false" ? false : true,
      gradeLevel: request.nextUrl.searchParams.get("gradeLevel") ?? undefined,
      termId: request.nextUrl.searchParams.get("termId") ?? undefined,
      teacherId: teachingContext.role === "TEACHER" ? teachingContext.teacherId ?? undefined : undefined,
    });
  });
}

export async function POST(request: NextRequest) {
  return withAuthenticatedApi(
    request,
    { mutation: true, json: true },
    async ({ context }, body = {}) => {
      requireRole(context, ["SCHOOL_OWNER", "ADMIN"]);
      return createClassroom(
        trustedTenantInput(context, {
          code: requiredString(body, "code"),
          name: requiredString(body, "name"),
          gradeLevel: requiredString(body, "gradeLevel"),
          isActive: optionalBoolean(body, "isActive"),
        }),
      );
    },
    201,
  );
}
