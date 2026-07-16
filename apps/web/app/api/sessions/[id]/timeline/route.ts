import {
  listClassSessionTimeline,
  requireClassSessionAccess,
} from "@classroom-os/database";
import { NextRequest } from "next/server";

import { withAuthenticatedApi } from "@/lib/api";

type SessionRouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, route: SessionRouteContext) {
  return withAuthenticatedApi(request, {}, async ({ context }) => {
    const { id } = await route.params;
    await requireClassSessionAccess(context, id);
    return listClassSessionTimeline({ schoolId: context.schoolId, sessionId: id });
  });
}
