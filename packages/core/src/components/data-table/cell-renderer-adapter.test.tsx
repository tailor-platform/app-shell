import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { createTypedCellRenderer, getCellValue, renderTypedValue } from "./cell-renderers";
import type { Column } from "./types";

afterEach(cleanup);

describe("DataTable renderer adapter compatibility", () => {
  const row = { id: "A", status: "open", name: "Raw name" };

  it("retains accessor/id lookup precedence without treating render output as raw data", () => {
    expect(getCellValue(row, { id: "name" })).toBe("Raw name");
    expect(getCellValue(row, { id: "name", accessor: (value) => value.status })).toBe("open");
    expect(getCellValue(row, { render: () => "Display only" })).toBeUndefined();
  });

  it("keeps edit-choice labels in legacy text rendering", () => {
    const col: Column<typeof row> = {
      id: "status",
      type: "text",
      edit: {
        options: [{ value: "open", label: "Open label" }],
        onValueCommitted: () => {},
      },
    };
    expect(createTypedCellRenderer(col, "UTC")(row)).toBe("Open label");
  });

  it("resolves legacy link labels and plaintext editor display outside table-core", () => {
    const col: Column<typeof row> = {
      id: "status",
      type: "link",
      typeOptions: { href: (value) => `/rows/${value.id}` },
      edit: {
        options: [{ value: "open", label: "Open label" }],
        onValueCommitted: () => {},
      },
    };
    expect(renderTypedValue(row, col, row.status, { linkAsText: true })).toBe("Open label");
    render(<MemoryRouter>{renderTypedValue(row, col, row.status)}</MemoryRouter>);
    expect(screen.getByRole("link", { name: "Open label" }).getAttribute("href")).toBe("/rows/A");
  });
});
