import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("completed session summary score navigation", () => {
  it("offers direct Quick Score access from the summary", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/sessions/[id]/summary/page.tsx"),
      "utf8",
    );

    expect(source).toContain('href={`/sessions/${id}/scores`}');
    expect(source).toContain("กรอกคะแนนด่วน");
  });
});
