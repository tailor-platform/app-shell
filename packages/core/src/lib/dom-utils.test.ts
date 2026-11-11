import { describe, expect, it, vi } from "vitest";
import { assignRef, joinIds } from "./dom-utils";

describe("joinIds", () => {
  it("joins the ids that are set", () => {
    expect(joinIds("a", undefined, null, false, "", "b")).toBe("a b");
  });

  it("returns undefined when none are set", () => {
    expect(joinIds(undefined, null)).toBeUndefined();
  });
});

describe("assignRef", () => {
  it("calls a callback ref", () => {
    const ref = vi.fn();
    assignRef(ref, "x");
    expect(ref).toHaveBeenCalledWith("x");
  });

  it("sets an object ref", () => {
    const ref = { current: null as string | null };
    assignRef(ref, "x");
    expect(ref.current).toBe("x");
  });

  it("ignores a missing ref", () => {
    expect(() => assignRef(undefined, "x")).not.toThrow();
  });
});
