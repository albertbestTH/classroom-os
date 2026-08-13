import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("attendance session guard", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "components/classroom/attendance-editor.tsx"),
    "utf8",
  );

  it("keeps completed and cancelled sessions read-only for direct batch edits", () => {
    expect(source).toContain(
      'const readOnly = initial.status === "completed" || initial.status === "cancelled";',
    );
    expect(source).toContain("{!readOnly ? <div");
    expect(source).toContain("<fieldset disabled={readOnly}");
  });

  it("exposes completed-session changes only through the correction flow", () => {
    expect(source).toContain('canCorrect && initial.status === "completed"');
    expect(source).toContain("/attendance/corrections");
    expect(source).toContain("ยืนยันและบันทึกประวัติ");
  });
});
