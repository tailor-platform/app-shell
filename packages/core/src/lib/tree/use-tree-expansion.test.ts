import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useTreeExpansion } from "./use-tree-expansion";

describe("useTreeExpansion", () => {
  it("keeps its own state when uncontrolled, starting from defaultExpandedIds", () => {
    const onExpandedChange = vi.fn();
    const { result } = renderHook(() =>
      useTreeExpansion({ defaultExpandedIds: ["a"], onExpandedChange }),
    );

    expect(result.current.isExpanded("a")).toBe(true);
    act(() => result.current.toggleExpand("b"));
    expect(result.current.isExpanded("b")).toBe(true);
    expect(result.current.expandedIds).toEqual(["a", "b"]);
    expect(onExpandedChange).toHaveBeenLastCalledWith(["a", "b"]);
  });

  it("follows expandedIds when controlled, and only reports changes", () => {
    const onExpandedChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ ids }: { ids: string[] }) => useTreeExpansion({ expandedIds: ids, onExpandedChange }),
      { initialProps: { ids: ["a"] } },
    );

    act(() => result.current.setExpanded("b", true));
    expect(onExpandedChange).toHaveBeenLastCalledWith(["a", "b"]);
    // Not open until the owner passes it back.
    expect(result.current.isExpanded("b")).toBe(false);

    rerender({ ids: ["a", "b"] });
    expect(result.current.isExpanded("b")).toBe(true);
  });

  it("composes several changes made before a render, when uncontrolled", () => {
    const onExpandedChange = vi.fn();
    const { result } = renderHook(() => useTreeExpansion({ onExpandedChange }));

    act(() => {
      result.current.setExpanded("a", true);
      result.current.setExpanded("b", true);
    });
    expect(onExpandedChange).toHaveBeenLastCalledWith(["a", "b"]);
    expect(result.current.expandedIds).toEqual(["a", "b"]);
  });

  it("builds each controlled change from what the owner passed, so a rejected one doesn't linger", () => {
    // An owner that ignores every change.
    const onExpandedChange = vi.fn();
    const { result } = renderHook(() => useTreeExpansion({ expandedIds: ["a"], onExpandedChange }));

    act(() => result.current.setExpanded("b", true));
    expect(onExpandedChange).toHaveBeenLastCalledWith(["a", "b"]);
    act(() => result.current.setExpanded("a", false));
    expect(onExpandedChange).toHaveBeenLastCalledWith([]);
  });

  it("lets a group a filter opened be closed, until the matches change", () => {
    const { result, rerender } = renderHook(
      ({ matchKey }: { matchKey: string }) =>
        useTreeExpansion({ autoExpand: new Set(["g"]), matchKey }),
      { initialProps: { matchKey: "one" } },
    );

    expect(result.current.isExpanded("g")).toBe(true);
    act(() => result.current.setExpanded("g", false));
    expect(result.current.isExpanded("g")).toBe(false);

    rerender({ matchKey: "one" });
    expect(result.current.isExpanded("g")).toBe(false);
    rerender({ matchKey: "two" });
    expect(result.current.isExpanded("g")).toBe(true);
  });
});
