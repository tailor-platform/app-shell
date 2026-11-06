import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { resolveLineItemsColumn } from "./column-adapter";
import { defineLineItemsEditor } from "./editor-adapter";
import type { LineItemsColumn } from "./types";

afterEach(cleanup);

type Row = { name: string | null; price: number | null; day: string | null };
const row: Row = { name: "Widget", price: 12.5, day: "2026-10-09" };
const t = Object.assign((key: string, ..._args: unknown[]) => key, {
  dynamic: (_key: string, fallback: string) => fallback,
});

describe("LineItems column adapter", () => {
  it("keeps money presentation independent from the number editor", () => {
    const adapter = resolveLineItemsColumn<Row>(
      {
        accessorKey: "price",
        type: "money",
        typeOptions: { currency: "USD", locale: "en-US" },
        edit: { editor: { type: "number" } },
      },
      "UTC",
    );
    render(<>{adapter.renderDisplay(row)}</>);
    expect(screen.getByText("$12.50")).toBeDefined();
    expect(adapter.align).toBe("right");
    expect(adapter.editor?.toDraft(row.price)).toBe("12.5");
    expect(adapter.editor?.parse("24.5", t)).toEqual({ ok: true, value: 24.5 });
  });

  it("preserves explicit alignment and never infers a value from a source-less ID", () => {
    const adapter = resolveLineItemsColumn<Row>(
      { id: "price", type: "money", align: "center" },
      "UTC",
    );
    render(<>{adapter.renderDisplay(row)}</>);
    expect(screen.getByText("—")).toBeDefined();
    expect(adapter.align).toBe("center");
    expect(adapter.editor).toBeUndefined();
  });

  it("uses computed accessors only when custom rendering does not override them", () => {
    const accessor = vi.fn((value: Row) => value.price);
    const custom = resolveLineItemsColumn<Row>(
      {
        id: "computed",
        type: "date",
        typeOptions: { locale: "not a locale" },
        accessor: () => accessor(row),
        render: () => null,
      },
      "UTC",
    );
    expect(custom.renderDisplay(row)).toBeNull();
    expect(accessor).not.toHaveBeenCalled();
    const computed = resolveLineItemsColumn<Row>(
      { id: "computed", type: "number", accessor, typeOptions: { locale: "en-US" } },
      "UTC",
    );
    render(<>{computed.renderDisplay(row)}</>);
    expect(accessor).toHaveBeenCalledWith(row);
    expect(screen.getByText("13")).toBeDefined();
  });

  it("keeps links with edit configuration as text even when canEdit rejects the row", () => {
    const href = vi.fn(() => "/widgets");
    const column: LineItemsColumn<Row> = {
      accessorKey: "name",
      type: "link",
      typeOptions: { href },
      edit: { editor: { type: "text" }, canEdit: () => false },
    };
    const adapter = resolveLineItemsColumn(column, "UTC");
    expect(adapter.renderDisplay(row)).toBe("Widget");
    expect(href).not.toHaveBeenCalled();
    column.edit = undefined;
    render(<MemoryRouter>{adapter.renderDisplay(row)}</MemoryRouter>);
    expect(screen.getByRole("link", { name: "Widget" }).getAttribute("href")).toBe("/widgets");
  });

  it("resolves current editor options without replacing the display renderer", () => {
    const editor = { type: "date" as const, options: { max: "2026-12-31" } };
    const adapter = resolveLineItemsColumn<Row>(
      { accessorKey: "day", type: "text", edit: { editor } },
      "UTC",
    );
    const display = adapter.renderDisplay;
    expect(adapter.editor?.parse(row.day, t)).toEqual({ ok: true, value: row.day });
    editor.options.max = "2026-01-01";
    expect(adapter.editor?.parse(row.day, t)).toEqual({ ok: false, message: "invalidDate" });
    expect(adapter.renderDisplay).toBe(display);
  });

  it("passes a custom editor through without taking over its draft or display", () => {
    const editor = defineLineItemsEditor<Row, number | null, { text: string }>({
      toDraft: (value) => ({ text: String(value ?? "") }),
      parse: () => ({ ok: true, value: null }),
      render: () => null,
    });
    const adapter = resolveLineItemsColumn<Row>(
      { accessorKey: "price", render: () => "Custom display", edit: { editor } },
      "UTC",
    );
    expect(adapter.renderDisplay(row)).toBe("Custom display");
    expect(adapter.editor?.toDraft(row.price)).toEqual({ text: "12.5" });
    expect(adapter.editor).toBe(adapter.editor);
  });
});
