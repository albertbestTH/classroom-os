// @vitest-environment jsdom

import fs from "node:fs";
import path from "node:path";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InlineScrollToTopButton } from "@/components/inline-scroll-to-top-button";

describe("InlineScrollToTopButton", () => {
  const scrollTo = vi.fn();

  function setScrollPosition(value: number) {
    Object.defineProperty(window, "scrollY", { configurable: true, value });
    fireEvent.scroll(window);
  }

  beforeEach(() => {
    scrollTo.mockReset();
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
    Object.defineProperty(window, "scrollTo", { configurable: true, value: scrollTo });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    });
  });

  afterEach(() => cleanup());

  it("is hidden near the top", () => {
    render(<InlineScrollToTopButton />);

    expect(screen.queryByRole("button", { name: "กลับขึ้นด้านบน" })).toBeNull();
  });

  it("appears after 500px as an icon-only control in normal document flow", () => {
    render(<InlineScrollToTopButton />);
    setScrollPosition(501);
    const button = screen.getByRole("button", { name: "กลับขึ้นด้านบน" });
    const container = screen.getByTestId("inline-scroll-to-top-container");

    expect(button.textContent).toBe("");
    expect(button.classList.contains("relative")).toBe(true);
    expect(button.classList.contains("fixed")).toBe(false);
    expect(button.classList.contains("sticky")).toBe(false);
    expect(container.classList.contains("fixed")).toBe(false);
    expect(container.classList.contains("sticky")).toBe(false);
    expect(button.classList.contains("pointer-events-auto")).toBe(true);
  });

  it("smooth-scrolls to the top and hides immediately", () => {
    render(<InlineScrollToTopButton />);
    setScrollPosition(700);
    fireEvent.click(screen.getByRole("button", { name: "กลับขึ้นด้านบน" }));

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
    expect(screen.queryByRole("button", { name: "กลับขึ้นด้านบน" })).toBeNull();
  });

  it("disables motion when the user prefers reduced motion", () => {
    vi.mocked(window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList);
    render(<InlineScrollToTopButton />);
    setScrollPosition(700);
    fireEvent.click(screen.getByRole("button", { name: "กลับขึ้นด้านบน" }));

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
  });

  it("contains no viewport-fixed or sticky positioning", () => {
    const { container } = render(<InlineScrollToTopButton />);

    expect(container.innerHTML).not.toMatch(/\b(?:fixed|sticky)\b/);
  });

  it("is scoped to the intended long-content screens rather than the global shell", () => {
    const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

    expect(read("components/app-shell.tsx")).not.toContain("InlineScrollToTopButton");
    for (const file of [
      "components/student-directory.tsx",
      "components/classroom/attendance-editor.tsx",
      "components/classroom/quick-score-panel.tsx",
      "app/attendance/page.tsx",
    ]) {
      expect(read(file)).toContain("<InlineScrollToTopButton />");
    }
    expect(read("components/student-directory.tsx")).not.toContain('aria-label="กลับไปด้านบน"');
  });
});
