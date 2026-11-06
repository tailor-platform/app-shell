import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { isValidElement } from "react";
import { MemoryRouter } from "react-router";
import { resolveDataTableColumn } from "./column-adapter";
import type { Column } from "./types";
import type { DataTableEditableCellProps } from "./editing/cell/shared";
import { TypingEditCell, type TypingEditPolicy } from "./editing/cell/typing";
import { ChoiceEditCell } from "./editing/cell/choice";
import { DateEditCell } from "./editing/cell/date";

afterEach(cleanup);

type Row = { id: string; value: string | number | null };
const row: Row = { id: "1", value: "open" };
const edit = { onValueCommitted: () => {} };
const choices = [{ value: "open", label: "Open label" }];

function editorElement(column: Column<Row>) {
  const adapter = resolveDataTableColumn(column, "UTC");
  // Inspect the bound element without mounting its unrelated cell/navigation context.
  const editor = adapter.editor;
  const element = editor?.render({ col: column } as DataTableEditableCellProps<Row>);
  if (!isValidElement<Record<string, unknown>>(element)) throw new Error("Missing editor");
  return { adapter, editor, element };
}

describe("DataTable column adapter", () => {
  it("resolves typed-input policies from the column definition", () => {
    for (const type of ["text", "number", "money"] as const) {
      const { adapter, element } = editorElement({ type, edit });
      expect(element.type).toBe(TypingEditCell);
      expect(element.props.numeric).toBe(type !== "text");
      expect(adapter.editor?.icon).toBeUndefined();
    }
    const link = editorElement({ type: "link", typeOptions: { href: () => "/" }, edit });
    expect(link.element.type).toBe(TypingEditCell);
    expect(link.element.props.numeric).toBe(false);
  });

  it("owns numeric conversion and equality without changing the raw draft contract", () => {
    const { element } = editorElement({ type: "money", edit });
    const policy = element.props as TypingEditPolicy;
    expect(policy.toDraft(12.5)).toBe("12.5");
    expect(policy.parse("1,234.50")).toBe(1234.5);
    expect(policy.parse("1,2")).toBeUndefined();
    expect(policy.parse("")).toBeNull();
    expect(policy.unchanged(12.5, 12.5)).toBe(true);
    expect(policy.unchanged(null, 0)).toBe(false);
  });

  it("resolves text choices even when empty, but rejects badges without choices", () => {
    const text = editorElement({ type: "text", edit: { ...edit, options: [] } });
    expect(text.element.type).toBe(ChoiceEditCell);
    expect(text.element.props.options).toEqual([]);
    expect(text.adapter.editor?.icon).toBeDefined();
    expect(resolveDataTableColumn<Row>({ type: "badge", edit }).editor).toBeUndefined();
    expect(resolveDataTableColumn<Row>({ type: "text" }).editor).toBeUndefined();
    expect(resolveDataTableColumn<Row>({ render: () => "Custom" }).editor).toBeUndefined();
  });

  it("shares badge fallback choices between display and editing and protects array values", () => {
    const column: Column<Row> = {
      type: "badge",
      typeOptions: { badgeLabelMap: { open: "Open label" } },
      edit,
    };
    const { adapter, element } = editorElement(column);
    expect(element.type).toBe(ChoiceEditCell);
    expect(element.props.options).toEqual(choices);
    expect(adapter.skeletonClassName).toBe("astw:h-5.5 astw:rounded-full");
    expect(adapter.editor?.canEditValue("open")).toBe(true);
    expect(adapter.editor?.canEditValue(["open"])).toBe(false);
    render(<>{adapter.renderValue("open", row)}</>);
    expect(screen.getByText("Open label")).toBeDefined();
  });

  it("retains badge edit-option/filter fallback precedence", () => {
    const filtered: Column<Row> = {
      type: "badge",
      filter: { type: "enum", field: "value", options: choices },
      edit,
    };
    expect(editorElement(filtered).element.props.options).toEqual(choices);
    expect(
      resolveDataTableColumn({ ...filtered, edit: { ...edit, options: [] }, type: "badge" }).editor,
    ).toBeUndefined();
  });

  it("resolves date and datetime settings, with a calendar icon from the same binding", () => {
    for (const dateFormat of ["short", "datetime"] as const) {
      const { editor, element } = editorElement({
        type: "date",
        typeOptions: { dateFormat },
        edit,
      });
      expect(element.type).toBe(DateEditCell);
      expect(element.props.withTime).toBe(dateFormat === "datetime");
      expect(element.props.icon).toBe(editor?.icon);
    }
  });

  it("keeps readonly links navigable and editable links as their resolved labels", () => {
    const href = vi.fn(() => "/rows/1");
    const adapter = resolveDataTableColumn<Row>(
      { type: "link", typeOptions: { href }, edit: { ...edit, options: choices } },
      "UTC",
    );
    expect(adapter.renderValue("open", row, { linkAsText: true })).toBe("Open label");
    expect(href).not.toHaveBeenCalled();
    render(<MemoryRouter>{adapter.renderValue("open", row)}</MemoryRouter>);
    expect(screen.getByRole("link", { name: "Open label" }).getAttribute("href")).toBe("/rows/1");
  });

  it("binds stable component identities and resets sessions only when error mode changes", () => {
    const first = editorElement({ type: "text", edit }).element;
    const rebuilt = editorElement({ type: "text", edit: { ...edit } }).element;
    const unhandled = editorElement({ type: "text", edit: { ...edit, error: false } }).element;
    expect(rebuilt.type).toBe(first.type);
    expect(rebuilt.key).toBe(first.key);
    expect(unhandled.type).toBe(first.type);
    expect(unhandled.key).not.toBe(first.key);
  });

  it("reads updated choice configuration without replacing cached display renderers", () => {
    const column: Column<Row> = { type: "text", edit: { ...edit, options: choices } };
    const adapter = resolveDataTableColumn(column, "UTC");
    const renderValue = adapter.renderValue;
    column.edit!.options = [{ value: "open", label: "Updated label" }];
    expect(adapter.renderValue).toBe(renderValue);
    expect(adapter.renderValue("open", row)).toBe("Updated label");
    const element = adapter.editor?.render({ col: column } as DataTableEditableCellProps<Row>);
    expect(isValidElement<Record<string, unknown>>(element) && element.props.options).toEqual(
      column.edit!.options,
    );
    column.edit!.options = undefined;
    const input = adapter.editor?.render({ col: column } as DataTableEditableCellProps<Row>);
    expect(isValidElement(input) && input.type).toBe(TypingEditCell);
  });

  it("does not resolve inherited registry names as editors", () => {
    const adapter = resolveDataTableColumn({ type: "constructor", edit } as unknown as Column<Row>);
    expect(adapter.editor).toBeUndefined();
    expect(adapter.renderValue("safe", row)).toBe("safe");
  });
});
