import { revokeServerSession } from "@classroom-os/database";
import { NextRequest } from "next/server";

import { apiError, apiSuccess, bearerTokenFromRequest, requireMobileApiSession } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    await requireMobileApiSession(request);
    await revokeServerSession(bearerTokenFromRequest(request));
    return apiSuccess({ loggedOut: true });
  } catch (error) {
    return apiError(error);
  }
}
