import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdminErrorState } from "@/components/admin/admin-error-state";
import { AdminLoadingState } from "@/components/admin/admin-loading-state";
import { EmptyCollectionState } from "@/components/admin/admin-state";
import { StaffDirectory } from "@/components/admin/staff-directory";

describe("admin collection states", () => {
  it("renders accessible loading and error states", () => {
    const loading = renderToStaticMarkup(<AdminLoadingState label="กำลังโหลดทดสอบ" />);
    const error = renderToStaticMarkup(<AdminErrorState reset={() => undefined} />);
    expect(loading).toContain('role="status"');
    expect(loading).toContain("กำลังโหลดทดสอบ");
    expect(error).toContain('role="alert"');
    expect(error).toContain('type="button"');
  });

  it("renders empty directory guidance without a table", () => {
    const directory = renderToStaticMarkup(<StaffDirectory page={{ items: [], nextCursor: null }} />);
    expect(directory).toContain("ไม่พบบุคลากร");
    expect(directory).not.toContain("<table");
    const generic = renderToStaticMarkup(<EmptyCollectionState title="ไม่มีข้อมูล" description="เพิ่มข้อมูลแรก" />);
    expect(generic).toContain('role="status"');
  });
});
