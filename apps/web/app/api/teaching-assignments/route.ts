import { listTeachingAssignments } from "@classroom-os/database";
import { NextRequest } from "next/server";

import { withAuthenticatedApi } from "@/lib/api";

export async function GET(request: NextRequest) {
  return withAuthenticatedApi(request, {}, async ({ context }) =>
    listTeachingAssignments({ auth: context }),
  );
}
