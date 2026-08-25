import { refreshMobileServerSession } from "@classroom-os/database";
import type { MobileSessionValidationResult } from "@classroom-os/types";
import { NextRequest } from "next/server";

import { apiError, apiSuccess, bearerTokenFromRequest } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const session = await refreshMobileServerSession(bearerTokenFromRequest(request));
    return apiSuccess<MobileSessionValidationResult>({
      expiresAt: session.expiresAt.toISOString(),
      user: session.user,
    });
  } catch (error) {
    return apiError(error);
  }
}
