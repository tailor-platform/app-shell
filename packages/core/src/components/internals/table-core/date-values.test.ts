import { describe, expect, it } from "vitest";
import { parseDateValue } from "./date-values";

describe("date-only editor values", () => {
  it("preserves calendar days without converting through a timezone", () => {
    expect(parseDateValue("2026-12-10")).toBe("2026-12-10");
    expect(parseDateValue("2024-02-29")).toBe("2024-02-29");
    expect(parseDateValue(null)).toBeNull();
  });
  it.each([undefined, "", "2026-02-29", "2026-12-32", "2026-1-2", "2026-12-10T00:00:00Z", 123])(
    "rejects malformed dates %j",
    (value) => {
      expect(parseDateValue(value)).toBeUndefined();
    },
  );
  it("checks inclusive bounds and rejects invalid bound configuration", () => {
    const bounds = { min: "2026-12-01", max: "2026-12-31" };
    expect(parseDateValue("2026-12-01", bounds)).toBe("2026-12-01");
    expect(parseDateValue("2026-12-31", bounds)).toBe("2026-12-31");
    expect(parseDateValue("2026-11-30", bounds)).toBeUndefined();
    expect(parseDateValue("2027-01-01", bounds)).toBeUndefined();
    expect(() => parseDateValue(null, { min: "bad" })).toThrow();
    expect(() => parseDateValue(null, { min: "2026-12-31", max: "2026-12-01" })).toThrow();
  });
});
