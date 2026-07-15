import {
  endClassSession,
  requireClassSessionAccess,
  trustedTenantInput,
} from "@classroom-os/database";
import { NextRequest } from "next/server";

import { optionalString, withAuthenticatedApi } from "@/lib/api";

type SessionRouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, route: SessionRouteContext) {
  return withAuthenticatedApi(
    request,
    { mutation: true, json: true },
    async ({ context }, body = {}) => {
      const { id } = await route.params;
      await requireClassSessionAccess(context, id);
      return endClassSession(
        trustedTenantInput(context, {
          sessionId: id,
          endedAt: optionalString(body, "endedAt"),
        }),
      );
    },
  );
}
