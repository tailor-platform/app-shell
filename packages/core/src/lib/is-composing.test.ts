import { describe, expect, it } from "vitest";
import { isComposing } from "./is-composing";

describe("isComposing", () => {
  it.each([
    { isComposing: false, keyCode: 13, composing: false, expected: false },
    { isComposing: true, keyCode: 13, composing: false, expected: true },
    { isComposing: false, keyCode: 229, composing: false, expected: true },
    { isComposing: false, keyCode: 13, composing: true, expected: true },
  ])("detects IME events: %o", ({ composing, expected, ...event }) => {
    expect(isComposing(new KeyboardEvent("keydown", event), composing)).toBe(expected);
  });

  it("defaults to the native event when no composition state is supplied", () => {
    expect(isComposing(new KeyboardEvent("keydown", { key: "Enter" }))).toBe(false);
  });
});
