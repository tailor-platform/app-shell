import { afterEach, describe, expect, it, vi } from "vitest";
import { createValueRenderer, getDisplayCellAdapter } from "./cell-renderers";
import { displayCellAdapters } from "./display-cell-adapters";
import type { ColumnCellType, ValueDisplayDescriptor } from "./column-types";

const context = { timeZone: "Asia/Tokyo" };
const descriptors = {
  text: { type: "text" },
  number: { type: "number", typeOptions: { minDecimals: 2 } },
  money: { type: "money", typeOptions: { currency: (row) => row.currency } },
  date: { type: "date", typeOptions: { locale: "en-US" } },
  badge: { type: "badge" },
  link: { type: "link", typeOptions: { href: (row) => `/rows/${row.id}` } },
} satisfies Record<ColumnCellType, ValueDisplayDescriptor<{ id: string; currency: string }>>;

afterEach(() => vi.restoreAllMocks());

describe("display renderer dispatch", () => {
  it.each(Object.values(descriptors))(
    "passes the descriptor and context unchanged to the $type adapter",
    (descriptor) => {
      const renderer = vi.fn(() => "Rendered");
      const prepare = vi
        .spyOn(displayCellAdapters[descriptor.type], "createRenderer")
        .mockReturnValue(renderer);
      const renderValue = createValueRenderer(descriptor, context);
      expect(prepare).toHaveBeenCalledExactlyOnceWith(descriptor, context);
      expect(renderValue).toBe(renderer);
      const row = { id: "A", currency: "EUR" };
      expect(renderValue("Raw value", row)).toBe("Rendered");
      expect(renderer).toHaveBeenCalledExactlyOnceWith("Raw value", row);
    },
  );

  it("looks up metadata without creating a renderer", () => {
    const prepare = vi.spyOn(displayCellAdapters.date, "createRenderer");
    expect(getDisplayCellAdapter("date")).toBe(displayCellAdapters.date);
    expect(getDisplayCellAdapter(undefined)).toBe(displayCellAdapters.text);
    expect(prepare).not.toHaveBeenCalled();
  });

  it("uses the text fallback when a display kind is omitted", () => {
    expect(createValueRenderer({}, context)("Raw value", {})).toBe("Raw value");
  });

  it.each(["custom", "constructor", "__proto__", Object("number"), { toString: () => "number" }])(
    "retains the text fallback for unsupported runtime type %s",
    (type: unknown) => {
      // @ts-expect-error Exercise malformed JavaScript configuration outside the typed contract.
      expect(getDisplayCellAdapter(type)).toBe(displayCellAdapters.text);
      // @ts-expect-error Exercise malformed JavaScript configuration outside the typed contract.
      expect(createValueRenderer({ type }, context)("Raw value", {})).toBe("Raw value");
    },
  );
});
