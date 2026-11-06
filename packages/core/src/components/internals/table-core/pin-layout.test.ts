import { describe, expect, it } from "vitest";
import { computePinPlacements, pinCellProps, resolvePin } from "./pin-layout";

describe("shared pin geometry", () => {
  it("keeps multiple right pins in DOM order next to a fixed utility column", () => {
    const result = computePinPlacements([
      { id: "sku", pin: "left", width: 100.25 },
      { id: "middle", width: 200 },
      { id: "amount", pin: "right", width: 144.5 },
      { id: "price", pin: "right", width: 120.25 },
      { id: "actions", pin: "right", width: 128 },
    ]);
    expect(result.get("sku")).toEqual({ side: "left", offset: 0, isBoundary: true });
    expect(result.get("actions")).toEqual({ side: "right", offset: 0, isBoundary: false });
    expect(result.get("price")).toEqual({ side: "right", offset: 128, isBoundary: false });
    expect(result.get("amount")).toEqual({ side: "right", offset: 248.25, isBoundary: true });
    expect(result.has("middle")).toBe(false);
  });
  it("accumulates fractional left offsets without rounding", () => {
    const result = computePinPlacements([
      { id: "selection", pin: "left", width: 52 },
      { id: "sku", pin: "left", width: 100.25 },
    ]);
    expect(result.get("selection")?.isBoundary).toBe(false);
    expect(result.get("sku")?.offset).toBe(52);
  });
  it("distinguishes default pin and explicit unpin, rejecting inherited/invalid values", () => {
    expect(resolvePin(undefined, "right")).toBe("right");
    expect(resolvePin(null, "right")).toBe("right");
    expect(resolvePin("none", "right")).toBeUndefined();
    expect(resolvePin("left", "right")).toBe("left");
    expect(resolvePin({}.constructor, "right")).toBe("right");
  });
  it("keeps consumer decoration while owning sticky position and boundary classes", () => {
    const result = pinCellProps(
      { side: "right", offset: 128.25, isBoundary: true },
      { style: { position: "relative", width: 144, backgroundColor: "red" }, className: "custom" },
      "footer",
    );
    expect(result.style).toMatchObject({
      position: "sticky",
      right: 128.25,
      width: 144,
      backgroundColor: "red",
    });
    expect(result.className).toContain("custom");
    expect(result.className).toContain("data-pin-shadow-right");
    const base = { className: "original" };
    expect(pinCellProps(undefined, base, "body")).toBe(base);
  });
});
