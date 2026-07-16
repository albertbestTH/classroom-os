import {
  createTimetableEntry,
  getTeachingAssignment,
  listTimetableEntries,
  requireClassroomAccess,
  trustedTenantInput,
} from "@classroom-os/database";
import { NextRequest } from "next/server";

import {
  optionalNullableString,
  requiredNumber,
  requiredString,
  withAuthenticatedApi,
} from "@/lib/api";

export async function GET(request: NextRequest) {
  return withAuthenticatedApi(request, {}, async ({ context }) => {
    const classroomId = request.nextUrl.searchParams.get("classroomId") ?? undefined;
    const termId = request.nextUrl.searchParams.get("termId") ?? undefined;
    const subjectId = request.nextUrl.searchParams.get("subjectId") ?? undefined;
    if (context.role === "TEACHER" && classroomId) {
      await requireClassroomAccess(context, { classroomId, termId });
    }
    return listTimetableEntries({
      schoolId: context.schoolId,
      classroomId,
      termId,
      teacherId: context.role === "TEACHER" ? context.teacherId ?? undefined : undefined,
      subjectId,
    });
  });
}

export async function POST(request: NextRequest) {
  return withAuthenticatedApi(
    request,
    { mutation: true, json: true },
    async ({ context }, body = {}) => {
      const assignment = await getTeachingAssignment({
        auth: context,
        teachingAssignmentId: requiredString(body, "teachingAssignmentId"),
      });
      return createTimetableEntry(
        trustedTenantInput(context, {
          termId: assignment.termId,
          teacherId: assignment.teacherId,
          classroomId: assignment.classroomId,
          subjectId: assignment.subjectId,
          weekday: requiredNumber(body, "weekday"),
          startTime: requiredString(body, "startTime"),
          endTime: requiredString(body, "endTime"),
          room: optionalNullableString(body, "room"),
        }),
      );
    },
    201,
  );
}
