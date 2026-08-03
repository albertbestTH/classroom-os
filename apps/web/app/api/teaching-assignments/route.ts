import { listTeachingAssignments } from "@classroom-os/database";
import { NextRequest } from "next/server";

import { withAuthenticatedApi } from "@/lib/api";
import { effectiveTeachingContext } from "@/lib/teaching-scope";

export async function GET(request: NextRequest) {
  return withAuthenticatedApi(request, {}, async ({ context, user }) =>
    listTeachingAssignments({ auth: effectiveTeachingContext(context, user) }),
  );
}
