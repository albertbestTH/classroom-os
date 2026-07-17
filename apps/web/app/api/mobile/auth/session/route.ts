import { NextRequest } from "next/server";

import { apiError, apiSuccess, requireMobileApiSession } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const session = await requireMobileApiSession(request);
    return apiSuccess(session.user);
  } catch (error) {
    return apiError(error);
  }
}
