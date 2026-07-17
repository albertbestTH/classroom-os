import { authError, revokeServerSession } from "@classroom-os/database";
import type { MobileSessionResult } from "@classroom-os/types";
import { NextRequest } from "next/server";

import { apiError, apiSuccess, readJsonObject, requiredString } from "@/lib/api";
import { getClientIp, loginWithRateLimit } from "@/lib/login-rate-limit";

export async function POST(request: NextRequest) {
  try {
    const body = await readJsonObject(request);
    const session = await loginWithRateLimit(
      { email: requiredString(body, "email"), password: requiredString(body, "password") },
      getClientIp(request.headers),
    );
    if (session.user.role !== "TEACHER") {
      await revokeServerSession(session.token);
      throw authError("FORBIDDEN", "School administration is available on the web application.");
    }
    return apiSuccess<MobileSessionResult>({
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
      user: session.user,
    });
  } catch (error) {
    return apiError(error);
  }
}
