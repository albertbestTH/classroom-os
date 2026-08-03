import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/health/route";

describe("health route", () => {
  it("returns a minimal no-store readiness response", async () => {
    const response = await GET();
    expect(response.headers.get("cache-control")).toContain("no-store");
    if (response.status === 200) await expect(response.json()).resolves.toMatchObject({ status: "ready", database: "ready" });
    else expect(response.status).toBe(503);
  });
});
