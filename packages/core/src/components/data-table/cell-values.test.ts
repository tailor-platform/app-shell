import { describe, expect, it } from "vitest";
import { optionLabel, resolveBadgeOptions } from "./cell-values";

describe("choices", () => {
  const choices = [
    { value: "acme", label: "Acme Corp" },
    { value: "7", label: "Seven" },
  ];

  it("labels a value by its choice, and leaves unknown or empty values alone", () => {
    expect(optionLabel(choices, "acme")).toBe("Acme Corp");
    expect(optionLabel(choices, 7)).toBe("Seven");
    expect(optionLabel(choices, "other")).toBe("other");
    expect(optionLabel(choices, null)).toBeNull();
    expect(optionLabel(undefined, "acme")).toBe("acme");
  });

  it("takes a badge column's choices from edit.options, then badgeLabelMap, then an enum filter", () => {
    const filter = {
      field: "status",
      type: "enum" as const,
      options: [{ value: "a", label: "A" }],
    };
    const typeOptions = { badgeLabelMap: { open: "Open", closed: "Closed" } };
    expect(resolveBadgeOptions(choices, typeOptions, filter)).toBe(choices);
    expect(resolveBadgeOptions(undefined, typeOptions, filter)).toEqual([
      { value: "open", label: "Open" },
      { value: "closed", label: "Closed" },
    ]);
    expect(resolveBadgeOptions(undefined, undefined, filter)).toEqual(filter.options);
    expect(resolveBadgeOptions(undefined, undefined, { field: "status", type: "string" })).toEqual(
      [],
    );
  });
});
