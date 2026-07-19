import { confirmOwnEmailChange } from "@classroom-os/database";
import { NextRequest } from "next/server";

import { apiError, apiSuccess, readJsonObject, requiredString } from "@/lib/api";
import { getClientIp } from "@/lib/login-rate-limit";
import { enforcePublicMutationRateLimit } from "@/lib/public-mutation-rate-limit";

export async function POST(request: NextRequest) {
  try {
    enforcePublicMutationRateLimit(getClientIp(request.headers), "email-change-confirm");
    const body = await readJsonObject(request);
    await confirmOwnEmailChange({ token: requiredString(body, "token") });
    return apiSuccess({ confirmed: true });
  } catch (error) {
    return apiError(error);
  }
}
