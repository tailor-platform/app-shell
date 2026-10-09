import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { renderTypedCell } from "./cell-renderers";
import type { Column } from "./types";

afterEach(cleanup);

describe("date cell rendering", () => {
  const column: Column<Record<string, unknown>> = {
    id: "value",
    type: "date",
    typeOptions: { locale: "en-US" },
  };

  it("preserves calendar dates even when the configured timezone skipped that day", () => {
    render(<>{renderTypedCell({ value: "2011-12-30" }, column, "Pacific/Apia")}</>);
    expect(screen.getByText("Dec 30, 2011")).toBeDefined();
  });

  it.each([null, undefined, "", "not-a-date", "2026-02-30", new Date(Number.NaN), Number.NaN])(
    "renders a placeholder for empty or invalid value %s",
    (value) => {
      render(<>{renderTypedCell({ value }, column, "America/Los_Angeles")}</>);
      expect(screen.getByText("—")).toBeDefined();
    },
  );
});
