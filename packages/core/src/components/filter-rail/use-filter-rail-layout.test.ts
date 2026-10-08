import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useFilterRailLayout } from "./use-filter-rail-layout";
import type { RailLayout } from "./types";

const KEY = "as:filter-rail-layout:v1:products";
const EMPTY: RailLayout = { order: [], hidden: [], sort: {} };

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("useFilterRailLayout", () => {
  it("starts empty and does not write on mount", () => {
    const { result } = renderHook(() => useFilterRailLayout("products"));
    expect(result.current.value).toEqual(EMPTY);
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it("reads a stored layout", () => {
    const stored: RailLayout = {
      order: ["status", "category"],
      hidden: ["price"],
      sort: { category: "label" },
    };
    window.localStorage.setItem(KEY, JSON.stringify(stored));
    const { result } = renderHook(() => useFilterRailLayout("products"));
    expect(result.current.value).toEqual(stored);
  });

  it("writes on change", () => {
    const { result } = renderHook(() => useFilterRailLayout("products"));
    const next: RailLayout = { order: ["b", "a"], hidden: ["c"], sort: { a: "baselineCount" } };
    act(() => result.current.onChange(next));
    expect(result.current.value).toEqual(next);
    expect(JSON.parse(window.localStorage.getItem(KEY)!)).toEqual(next);
  });

  it("ignores malformed JSON", () => {
    window.localStorage.setItem(KEY, "{oops");
    const { result } = renderHook(() => useFilterRailLayout("products"));
    expect(result.current.value).toEqual(EMPTY);
  });

  it("drops invalid members of a stored layout", () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        order: ["a", 1, null],
        hidden: "nope",
        sort: { a: "label", b: "liveCount" },
      }),
    );
    const { result } = renderHook(() => useFilterRailLayout("products"));
    expect(result.current.value).toEqual({ order: ["a"], hidden: [], sort: { a: "label" } });
  });

  it("onReset clears state and storage", () => {
    window.localStorage.setItem(KEY, JSON.stringify({ order: ["a"], hidden: [], sort: {} }));
    const { result } = renderHook(() => useFilterRailLayout("products"));
    act(() => result.current.onReset?.());
    expect(result.current.value).toEqual(EMPTY);
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it("re-hydrates when the key changes", () => {
    window.localStorage.setItem(
      "as:filter-rail-layout:v1:orders",
      JSON.stringify({ order: ["x"], hidden: [], sort: {} }),
    );
    const { result, rerender } = renderHook(({ key }) => useFilterRailLayout(key), {
      initialProps: { key: "products" },
    });
    expect(result.current.value).toEqual(EMPTY);
    rerender({ key: "orders" });
    expect(result.current.value.order).toEqual(["x"]);
  });
});
