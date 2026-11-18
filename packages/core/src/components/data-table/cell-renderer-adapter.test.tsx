import { afterEach, describe, expect, it, vi } from "vitest";
import * as tableCore from "@/components/internals/table-core";
import { cleanup, render, renderHook, screen } from "@testing-library/react";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { useEditorProps } from "./editing/cell/shared";
import { createCellEditNavigation } from "./editing/use-navigation";
import { MemoryRouter } from "react-router";
import {
  createTypedCellRenderer,
  createTypedValueRenderer,
  getCellValue,
  renderTypedValue,
} from "./cell-renderers";
import type { Column } from "./types";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("DataTable renderer adapter compatibility", () => {
  const row = { id: "A", status: "open", name: "Raw name" };

  it("retains accessor/id lookup precedence without treating render output as raw data", () => {
    expect(getCellValue(row, { id: "name" })).toBe("Raw name");
    expect(getCellValue(row, { id: "name", accessor: (value) => value.status })).toBe("open");
    expect(getCellValue(row, { render: () => "Display only" })).toBeUndefined();
  });

  it.each([false, true])(
    "resolves an editable value once with a prepared renderer (custom display: %s)",
    (custom) => {
      const accessor = vi.fn((value: typeof row) => value.name);
      const col = {
        id: "name",
        type: "text",
        accessor,
        render: custom ? () => "Custom" : undefined,
        edit: { onValueCommitted: () => {} },
      } satisfies Column<typeof row>;
      const valueRenderer = vi.fn(createTypedValueRenderer(col, { timeZone: "UTC" }));
      const { result } = renderHook(
        () =>
          useEditorProps({
            row,
            col,
            valueRenderer,
            rowKey: row.id,
            colKey: "name",
            label: "Name",
            align: "left",
            navigation: createCellEditNavigation(),
            cellProps: {},
          }),
        { wrapper: createAppShellWrapper() },
      );
      expect(accessor).toHaveBeenCalledExactlyOnceWith(row);
      expect(result.current.current).toBe("Raw name");
      expect(result.current.display).toBe(custom ? "Custom" : "Raw name");
      if (custom) expect(valueRenderer).not.toHaveBeenCalled();
      else expect(valueRenderer).toHaveBeenCalledExactlyOnceWith("Raw name", row);
    },
  );

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

  it.each(["number", "money"] as const)(
    "prepares a %s renderer once rather than recreating it for each row",
    (type) => {
      const createRenderer = vi.spyOn(tableCore, "createValueRenderer");
      const col: Column<{ value: number }> = { id: "value", type };
      const renderer = createTypedCellRenderer(col, "UTC");
      expect(createRenderer).toHaveBeenCalledExactlyOnceWith(col, { timeZone: "UTC" });
      renderer({ value: 1 });
      renderer({ value: 2 });
      renderer({ value: 3 });
      expect(createRenderer).toHaveBeenCalledOnce();
    },
  );

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
    const readonly = createTypedCellRenderer(col, "UTC");
    const editable = createTypedCellRenderer(col, "UTC", { linkAsText: true });
    expect(editable(row)).toBe("Open label");
    expect(renderTypedValue(row, col, row.status, { linkAsText: true })).toBe("Open label");
    render(<MemoryRouter>{readonly(row)}</MemoryRouter>);
    expect(screen.getByRole("link", { name: "Open label" }).getAttribute("href")).toBe("/rows/A");
  });
});
