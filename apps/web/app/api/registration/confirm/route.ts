import { confirmSchoolRegistration } from "@classroom-os/database";
import { NextRequest } from "next/server";

import { apiError, apiSuccess, readJsonObject, requiredString } from "@/lib/api";
import { getClientIp } from "@/lib/login-rate-limit";
import { enforcePublicMutationRateLimit } from "@/lib/public-mutation-rate-limit";

export async function POST(request: NextRequest) {
  try {
    enforcePublicMutationRateLimit(getClientIp(request.headers), "registration-confirm");
    const body = await readJsonObject(request);
    return apiSuccess(await confirmSchoolRegistration({ token: requiredString(body, "token") }));
  } catch (error) {
    return apiError(error);
  }
}
