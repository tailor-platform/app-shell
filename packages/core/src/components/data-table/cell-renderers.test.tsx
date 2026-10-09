import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { createTypedCellRenderer } from "./cell-renderers";
import type { Column } from "./types";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("date cell rendering", () => {
  const column: Column<Record<string, unknown>> = {
    id: "value",
    type: "date",
    typeOptions: { locale: "en-US" },
  };

  it("preserves calendar dates even when the configured timezone skipped that day", () => {
    const renderCell = createTypedCellRenderer(column, "Pacific/Apia");
    render(<>{renderCell({ value: "2011-12-30" })}</>);
    expect(screen.getByText("Dec 30, 2011")).toBeDefined();
  });

  it("reuses one UTC and one zoned formatter across values and repeated rendering", () => {
    const DateTimeFormat = Intl.DateTimeFormat;
    const formatterSpy = vi
      .spyOn(Intl, "DateTimeFormat")
      .mockImplementation(function (locales, options) {
        return new DateTimeFormat(locales, options);
      });
    const renderCell = createTypedCellRenderer(column, "America/New_York");
    for (let i = 0; i < 3; i++) {
      expect(renderCell({ value: "2026-10-09" })).toBe("Oct 9, 2026");
      expect(renderCell({ value: "2026-10-10" })).toBe("Oct 10, 2026");
      expect(renderCell({ value: "2026-10-09T00:00:00Z" })).toBe("Oct 8, 2026");
      expect(renderCell({ value: "2026-10-10T00:00:00Z" })).toBe("Oct 9, 2026");
    }
    const cellFormatters = formatterSpy.mock.calls.filter(
      ([locale, options]) => locale === "en-US" && options?.month === "short",
    );
    expect(cellFormatters.map(([, options]) => options?.timeZone)).toEqual([
      "UTC",
      "America/New_York",
    ]);
  });

  it.each([null, undefined, "", "not-a-date", "2026-02-30", new Date(Number.NaN), Number.NaN])(
    "renders a placeholder for empty or invalid value %s",
    (value) => {
      const renderCell = createTypedCellRenderer(column, "America/Los_Angeles");
      render(<>{renderCell({ value })}</>);
      expect(screen.getByText("—")).toBeDefined();
    },
  );
});
