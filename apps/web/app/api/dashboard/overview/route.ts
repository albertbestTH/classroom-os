import { getDashboardOverview } from "@classroom-os/database";
import { NextRequest } from "next/server";

import { withAuthenticatedApi } from "@/lib/api";
import { dashboardFiltersFromSearchParams } from "@/lib/dashboard";

export async function GET(request: NextRequest) {
  return withAuthenticatedApi(request, {}, async ({ context, user }) =>
    getDashboardOverview({
      schoolId: context.schoolId,
      auth: user.workspaceType === "PERSONAL" ? { ...context, role: "TEACHER" as const } : context,
      filters: dashboardFiltersFromSearchParams(request.nextUrl.searchParams),
    }),
  );
}
