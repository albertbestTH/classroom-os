import { resolveTheme } from "@/features/theme/theme-context";

describe("theme resolution", () => {
  it("follows the system preference", () => {
    expect(resolveTheme("system", "dark")).toBe("dark");
    expect(resolveTheme("system", "light")).toBe("light");
  });
  it("allows an explicit override", () => expect(resolveTheme("dark", "light")).toBe("dark"));
});
