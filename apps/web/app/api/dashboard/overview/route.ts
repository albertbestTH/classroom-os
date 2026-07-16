import { getDashboardOverview } from "@classroom-os/database";
import { NextRequest } from "next/server";

import { withAuthenticatedApi } from "@/lib/api";
import { dashboardFiltersFromSearchParams } from "@/lib/dashboard";

export async function GET(request: NextRequest) {
  return withAuthenticatedApi(request, {}, async ({ context }) =>
    getDashboardOverview({
      schoolId: context.schoolId,
      auth: context,
      filters: dashboardFiltersFromSearchParams(request.nextUrl.searchParams),
    }),
  );
}
