import {
  createAssessment,
  domainError,
  getClassSession,
  getGradebook,
  getTeachingAssignment,
  requireClassSessionAccess,
  trustedTenantInput,
} from "@classroom-os/database";
import type { AssessmentType } from "@classroom-os/types";
import { NextRequest } from "next/server";

import {
  optionalNullableString,
  requiredNumber,
  requiredString,
  withAuthenticatedApi,
} from "@/lib/api";

export async function GET(request: NextRequest) {
  return withAuthenticatedApi(request, {}, async ({ context }) => {
    const teachingAssignmentId = request.nextUrl.searchParams.get("teachingAssignmentId") ?? "";
    const classSessionId = request.nextUrl.searchParams.get("classSessionId");
    if (classSessionId) {
      await requireClassSessionAccess(context, classSessionId);
      const session = await getClassSession({ schoolId: context.schoolId, sessionId: classSessionId });
      if (session.teachingAssignmentId !== teachingAssignmentId) {
        throw domainError("TENANT_ACCESS_DENIED", "The class session does not match the teaching assignment.");
      }
      return getGradebook({ schoolId: context.schoolId, teachingAssignmentId });
    }
    const assignment = await getTeachingAssignment({ auth: context, teachingAssignmentId });
    return getGradebook({
      schoolId: context.schoolId,
      teachingAssignmentId: assignment.id,
    });
  });
}

export async function POST(request: NextRequest) {
  return withAuthenticatedApi(
    request,
    { mutation: true, json: true },
    async ({ context }, body = {}) => {
      const teachingAssignmentId = requiredString(body, "teachingAssignmentId");
      const classSessionId = optionalNullableString(body, "classSessionId");
      const session = classSessionId
        ? await (async () => {
            await requireClassSessionAccess(context, classSessionId);
            const accessible = await getClassSession({ schoolId: context.schoolId, sessionId: classSessionId });
            if (accessible.teachingAssignmentId !== teachingAssignmentId) throw domainError("TENANT_ACCESS_DENIED", "The class session does not match the teaching assignment.");
            return accessible;
          })()
        : null;
      const assignment = session ?? await getTeachingAssignment({ auth: context, teachingAssignmentId });
      if (classSessionId) {
        await requireClassSessionAccess(context, classSessionId, assignment.classroomId);
      }
      return createAssessment(
        trustedTenantInput(context, {
          termId: assignment.termId,
          classroomId: assignment.classroomId,
          subjectId: assignment.subjectId,
          teacherId: assignment.teacherId,
          classSessionId,
          title: requiredString(body, "title"),
          type: requiredString(body, "type") as AssessmentType,
          maxScore: requiredNumber(body, "maxScore"),
          dueAt: optionalNullableString(body, "dueAt"),
        }),
      );
    },
    201,
  );
}
