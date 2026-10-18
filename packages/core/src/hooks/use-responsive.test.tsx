import { act, cleanup, render, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useIsMobile } from "./use-mobile";
import { useIsTablet } from "./use-tablet";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function ViewportProbe({ onRender }: { onRender?: (mobile: boolean, tablet: boolean) => void }) {
  const mobile = useIsMobile();
  const tablet = useIsTablet();
  onRender?.(mobile, tablet);
  return <span>{`${mobile}/${tablet}`}</span>;
}

describe("responsive viewport hooks", () => {
  it.each([
    [767, true, false],
    [768, false, true],
    [1199, false, true],
    [1200, false, false],
  ] as const)("reads %ipx on the first client render", (width, mobile, tablet) => {
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(width);
    const onRender = vi.fn();

    render(<ViewportProbe onRender={onRender} />);

    expect(onRender).toHaveBeenNthCalledWith(1, mobile, tablet);
  });

  it("updates on media changes without resubscribing on rerender and unsubscribes on unmount", () => {
    const width = vi.spyOn(window, "innerWidth", "get").mockReturnValue(1200);
    const media = window.matchMedia("(min-width: 0px)");
    const addListener = vi.spyOn(media, "addEventListener");
    const removeListener = vi.spyOn(media, "removeEventListener");
    const matchMedia = vi.spyOn(window, "matchMedia").mockReturnValue(media);
    const { result, rerender, unmount } = renderHook(() => ({
      mobile: useIsMobile(),
      tablet: useIsTablet(),
    }));

    expect(result.current).toEqual({ mobile: false, tablet: false });
    expect(matchMedia.mock.calls).toEqual([
      ["(max-width: 767px)"],
      ["(min-width: 768px) and (max-width: 1199px)"],
    ]);

    for (const [nextWidth, mobile, tablet] of [
      [767, true, false],
      [768, false, true],
      [1199, false, true],
      [1200, false, false],
    ] as const) {
      act(() => {
        width.mockReturnValue(nextWidth);
        media.dispatchEvent(new Event("change"));
      });
      expect(result.current).toEqual({ mobile, tablet });
    }

    rerender();
    expect(addListener).toHaveBeenCalledTimes(2);
    unmount();
    expect(removeListener.mock.calls).toEqual(addListener.mock.calls);
  });

  it("returns false during SSR without accessing window", () => {
    vi.stubGlobal("window", undefined);

    expect(renderToString(<ViewportProbe />)).toBe("<span>false/false</span>");
  });

  it.each([
    [375, true, false],
    [1024, false, true],
  ] as const)("hydrates the server fallback before reading %ipx", (width, mobile, tablet) => {
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(width);
    const container = document.createElement("div");
    container.innerHTML = renderToString(<ViewportProbe />);
    const onRender = vi.fn();
    const errors = vi.spyOn(console, "error");

    render(<ViewportProbe onRender={onRender} />, { container, hydrate: true });

    expect(onRender).toHaveBeenNthCalledWith(1, false, false);
    expect(onRender).toHaveBeenLastCalledWith(mobile, tablet);
    expect(errors).not.toHaveBeenCalled();
  });
});
