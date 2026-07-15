import {
  assignTeacherToClass,
  listTeachingAssignments,
} from "@classroom-os/database";
import { NextRequest } from "next/server";

import { requiredString, withAuthenticatedApi } from "@/lib/api";

type StaffRouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, route: StaffRouteContext) {
  return withAuthenticatedApi(request, {}, async ({ context }) => {
    const { id } = await route.params;
    return listTeachingAssignments({ auth: context, userId: id });
  });
}

export async function POST(request: NextRequest, route: StaffRouteContext) {
  return withAuthenticatedApi(
    request,
    { mutation: true, json: true },
    async ({ context }, body = {}) => {
      const { id } = await route.params;
      return assignTeacherToClass({
        auth: context,
        assignment: {
          userId: id,
          termId: requiredString(body, "termId"),
          classroomId: requiredString(body, "classroomId"),
          subjectId: requiredString(body, "subjectId"),
        },
      });
    },
    201,
  );
}
