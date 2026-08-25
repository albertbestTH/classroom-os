import {
  createScoreCategory,
  getGradebook,
  getTeachingAssignment,
  trustedTenantInput,
} from "@classroom-os/database";
import { NextRequest } from "next/server";

import { requiredString, withAuthenticatedApi } from "@/lib/api";

export async function GET(request: NextRequest) {
  return withAuthenticatedApi(request, {}, async ({ context }) => {
    const teachingAssignmentId = request.nextUrl.searchParams.get("teachingAssignmentId") ?? "";
    const assignment = await getTeachingAssignment({ auth: context, teachingAssignmentId });
    return (await getGradebook({ schoolId: context.schoolId, teachingAssignmentId: assignment.id })).categories;
  });
}

export async function POST(request: NextRequest) {
  return withAuthenticatedApi(request, { mutation: true, json: true }, async ({ context }, body = {}) => {
    const teachingAssignmentId = requiredString(body, "teachingAssignmentId");
    const assignment = await getTeachingAssignment({ auth: context, teachingAssignmentId });
    return createScoreCategory(trustedTenantInput(context, {
      teachingAssignmentId: assignment.id,
      termId: assignment.termId,
      name: requiredString(body, "name"),
    }));
  }, 201);
}
