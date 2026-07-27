import { requestPasswordReset } from "@classroom-os/database";
import { NextRequest } from "next/server";

import { apiError, apiSuccess, readJsonObject, requiredString } from "@/lib/api";
import { getClientIp } from "@/lib/login-rate-limit";
import { enforcePublicMutationRateLimit } from "@/lib/public-mutation-rate-limit";

export async function POST(request: NextRequest) {
  try {
    enforcePublicMutationRateLimit(getClientIp(request.headers), "password-reset-request");
    const body = await readJsonObject(request);
    return apiSuccess(await requestPasswordReset({ email: requiredString(body, "email") }));
  } catch (error) {
    return apiError(error);
  }
}
