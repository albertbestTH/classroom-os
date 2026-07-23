import { matchesSearch, normalizeSearch } from "@/lib/search";

describe("teacher search", () => {
  it("normalizes whitespace and case", () => expect(normalizeSearch("  Somchai   TEST ")).toBe("somchai test"));
  it("matches student number and Thai name", () => {
    expect(matchesSearch("65001", ["65001", "สมชาย", "ใจดี"])).toBe(true);
    expect(matchesSearch("สมชาย", ["65001", "สมชาย", "ใจดี"])).toBe(true);
    expect(matchesSearch("ไม่มี", ["65001", "สมชาย", "ใจดี"])).toBe(false);
  });
});
