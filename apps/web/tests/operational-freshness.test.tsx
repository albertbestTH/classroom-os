// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OperationalFreshness } from "@/components/operational-freshness";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

describe("OperationalFreshness", () => {
  beforeEach(() => { vi.useFakeTimers(); refresh.mockReset(); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it("refreshes on focus/visibility without a duplicate storm and polls only while enabled", () => {
    const view = render(<OperationalFreshness poll />);
    act(() => { window.dispatchEvent(new Event("focus")); document.dispatchEvent(new Event("visibilitychange")); });
    expect(refresh).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(10_000));
    expect(refresh).toHaveBeenCalledTimes(2);
    view.rerender(<OperationalFreshness poll={false} />);
    act(() => vi.advanceTimersByTime(20_000));
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
