import { confirmPasswordReset } from "@classroom-os/database";
import { NextRequest } from "next/server";

import { apiError, apiSuccess, readJsonObject, requiredString } from "@/lib/api";
import { getClientIp } from "@/lib/login-rate-limit";
import { enforcePublicMutationRateLimit } from "@/lib/public-mutation-rate-limit";

export async function POST(request: NextRequest) {
  try {
    enforcePublicMutationRateLimit(getClientIp(request.headers), "password-reset-confirm");
    const body = await readJsonObject(request);
    await confirmPasswordReset({
      token: requiredString(body, "token"),
      newPassword: requiredString(body, "newPassword"),
    });
    return apiSuccess({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
