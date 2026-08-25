import { deleteTeachingAssignment } from "@classroom-os/database";
import { NextRequest } from "next/server";

import { withAuthenticatedApi } from "@/lib/api";

export async function DELETE(request: NextRequest, route: { params: Promise<{ id: string }> }) {
  return withAuthenticatedApi(request, { mutation: true }, async ({ context }) => {
    const { id } = await route.params;
    await deleteTeachingAssignment({ auth: context, teachingAssignmentId: id });
    return null;
  });
}
