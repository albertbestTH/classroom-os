import {
  createAssessment,
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

export async function POST(request: NextRequest) {
  return withAuthenticatedApi(
    request,
    { mutation: true, json: true },
    async ({ context }, body = {}) => {
      const assignment = await getTeachingAssignment({
        auth: context,
        teachingAssignmentId: requiredString(body, "teachingAssignmentId"),
      });
      const classSessionId = optionalNullableString(body, "classSessionId");
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
