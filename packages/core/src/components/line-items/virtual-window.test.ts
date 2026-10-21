import { describe, expect, it } from "vitest";

import { computeVirtualWindow, sameVirtualWindow } from "./virtual-window";

const base = { rowCount: 1000, rowHeight: 32, viewportHeight: 320, overscan: 4 };

describe("computeVirtualWindow", () => {
  it("mounts only the visible slice plus overscan", () => {
    const w = computeVirtualWindow({ ...base, scrollTop: 0 });
    expect(w.startIndex).toBe(0);
    expect(w.endIndex).toBe(15);
    expect(w.endIndex - w.startIndex).toBeLessThan(base.rowCount);
  });

  it("spacer heights always account for the unmounted rows", () => {
    const w = computeVirtualWindow({ ...base, scrollTop: 3200 });
    const totalHeight =
      w.paddingTop + (w.endIndex - w.startIndex) * base.rowHeight + w.paddingBottom;
    expect(totalHeight).toBe(base.rowCount * base.rowHeight);
  });

  it("advances the window as the container scrolls", () => {
    const top = computeVirtualWindow({ ...base, scrollTop: 0 });
    const mid = computeVirtualWindow({ ...base, scrollTop: 3200 });
    expect(mid.startIndex).toBeGreaterThan(top.startIndex);
    expect(mid.paddingTop).toBe(mid.startIndex * base.rowHeight);
  });

  it("clamps at the top rather than going negative", () => {
    const w = computeVirtualWindow({ ...base, scrollTop: -500 });
    expect(w.startIndex).toBe(0);
    expect(w.paddingTop).toBe(0);
  });

  it("clamps at the bottom with no trailing spacer", () => {
    const w = computeVirtualWindow({ ...base, scrollTop: base.rowCount * base.rowHeight });
    expect(w.endIndex).toBe(base.rowCount);
    expect(w.paddingBottom).toBe(0);
    expect(w.startIndex).toBeLessThan(base.rowCount);
  });

  it("returns an empty window for an empty document", () => {
    expect(computeVirtualWindow({ ...base, rowCount: 0, scrollTop: 0 })).toEqual({
      startIndex: 0,
      endIndex: 0,
      paddingTop: 0,
      paddingBottom: 0,
    });
  });

  it("mounts a leading slice before layout has measured the viewport", () => {
    const w = computeVirtualWindow({ ...base, viewportHeight: 0, scrollTop: 0 });
    expect(w.endIndex).toBeGreaterThan(0);
  });

  it("mounts every row when the document is shorter than the viewport", () => {
    const w = computeVirtualWindow({ ...base, rowCount: 3, scrollTop: 0 });
    expect(w.startIndex).toBe(0);
    expect(w.endIndex).toBe(3);
    expect(w.paddingBottom).toBe(0);
  });
});

describe("sameVirtualWindow", () => {
  it("compares by mounted range so sub-row scrolling does not re-render", () => {
    const a = computeVirtualWindow({ ...base, scrollTop: 100 });
    const b = computeVirtualWindow({ ...base, scrollTop: 110 });
    expect(sameVirtualWindow(a, b)).toBe(true);

    const c = computeVirtualWindow({ ...base, scrollTop: 900 });
    expect(sameVirtualWindow(a, c)).toBe(false);
  });
});
