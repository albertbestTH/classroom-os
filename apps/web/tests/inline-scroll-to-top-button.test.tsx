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
  });

  afterEach(() => cleanup());

  it("is hidden at the top of the page", () => {
    render(<InlineScrollToTopButton />);

    expect(screen.queryByRole("button", { name: "กลับขึ้นด้านบน" })).toBeNull();
  });

  it("appears after scrolling more than 500px and follows the viewport", () => {
    render(<InlineScrollToTopButton />);
    setScrollPosition(501);

    const button = screen.getByRole("button", { name: "กลับขึ้นด้านบน" });
    expect(button.textContent).toBe("");
    expect(button.classList.contains("fixed")).toBe(true);
    expect(button.classList.contains("pointer-events-auto")).toBe(true);
  });

  it("locks the approved visual placement and compact circular treatment", () => {
    render(<InlineScrollToTopButton />);
    setScrollPosition(501);

    const button = screen.getByTestId("inline-scroll-to-top-control");
    expect(button.className).toContain("fixed");
    expect(button.className).toContain("bottom-6");
    expect(button.className).toContain("right-6");
    expect(button.className).toContain("size-11");
    expect(button.className).toContain("rounded-full");
    expect(button.className).toContain("bg-blue-600");
    expect(button.className).toContain("text-white");
  });

  it("smooth-scrolls to the top and hides immediately", () => {
    render(<InlineScrollToTopButton />);
    setScrollPosition(700);

    fireEvent.click(screen.getByRole("button", { name: "กลับขึ้นด้านบน" }));

    expect(scrollTo).toHaveBeenCalledOnce();
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
    expect(screen.queryByRole("button", { name: "กลับขึ้นด้านบน" })).toBeNull();
  });

  it("hides again when scrolling back to the top", () => {
    render(<InlineScrollToTopButton />);
    setScrollPosition(700);
    expect(screen.getByRole("button", { name: "กลับขึ้นด้านบน" })).toBeTruthy();

    setScrollPosition(0);
    expect(screen.queryByRole("button", { name: "กลับขึ้นด้านบน" })).toBeNull();
  });

  it("renders exactly once on each intended screen and never in the global shell", () => {
    const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");
    const usage = "<InlineScrollToTopButton />";

    expect(read("components/app-shell.tsx")).not.toContain("InlineScrollToTopButton");
    expect(read("app/layout.tsx")).not.toContain("InlineScrollToTopButton");
    for (const file of [
      "components/student-directory.tsx",
      "components/classroom/attendance-editor.tsx",
      "components/classroom/quick-score-panel.tsx",
      "app/attendance/page.tsx",
    ]) {
      expect(read(file).split(usage)).toHaveLength(2);
    }
  });
});
