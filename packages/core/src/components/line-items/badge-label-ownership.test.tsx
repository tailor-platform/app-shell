import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AppShellConfigContext, buildConfigurations } from "@/contexts/appshell-context";
import { createLineItemsDocument } from "./document/model";
import type { DocumentOptions } from "./document/types";
import { LineItems } from "./line-items";
import { useLineItems } from "./use-line-items";
import type { LineItemsColumn } from "./types";

afterEach(cleanup);
type Row = { id?: string; status: string | null; allowed: boolean };
const choices = {
  editorType: "combobox" as const,
  editorOptions: { options: [{ value: "open", label: "Open" }] },
  canEdit: (row: Row) => row.allowed,
};
const base = { accessorKey: "status" as const, type: "badge" as const, label: "Status" };
const rows: Row[] = [
  { id: "A", status: "open", allowed: true },
  { id: "B", status: "archived", allowed: false },
];
const invalid = {
  ...base,
  typeOptions: { badgeLabelMap: { open: "Competing label" } },
  edit: choices,
};
const message = "Combobox badge labels must be defined in editorOptions.options only";

function setup(column: LineItemsColumn<Row>) {
  function Owner() {
    const value = useLineItems<Row>({ columns: [column], defaultLines: rows, orderer: false });
    return (
      <MemoryRouter>
        <AppShellConfigContext.Provider
          value={{ configurations: buildConfigurations({ modules: [], locale: "en" }) }}
        >
          <LineItems.Root value={value}>
            <LineItems.Table />
          </LineItems.Root>
        </AppShellConfigContext.Provider>
      </MemoryRouter>
    );
  }
  return render(<Owner />);
}

describe("LineItems badge label ownership", () => {
  it.each([undefined, () => false])(
    "rejects competing labels from untyped configuration regardless of edit permission (%s)",
    (canEdit) => {
      const options = {
        columns: [{ ...invalid, edit: { ...choices, canEdit } }],
        lines: rows,
      } as unknown as DocumentOptions<Row>;
      expect(() => createLineItemsDocument(options)).toThrow(message);
    },
  );

  it("rejects competing labels even when a custom renderer would hide them", () => {
    const options = {
      columns: [{ ...invalid, render: () => null }],
      lines: rows,
    } as unknown as DocumentOptions<Row>;
    expect(() => createLineItemsDocument(options)).toThrow(message);
  });

  it("validates later columns without changing the existing document", () => {
    const document = createLineItemsDocument<Row>({ columns: [base], lines: rows });
    const snapshot = document.getRows();
    expect(() => document.assertColumns([invalid] as unknown as LineItemsColumn<Row>[])).toThrow(
      message,
    );
    expect(document.getRows()).toBe(snapshot);
    expect(document.isDirty()).toBe(false);
  });

  it("uses choices as the sole label source, raw text for unlisted values, and raw variants", () => {
    setup({
      accessorKey: "status",
      type: "badge",
      label: "Status",
      edit: choices,
      typeOptions: {
        badgeVariantMap: { open: "success", archived: "neutral" },
        defaultBadgeVariant: "outline-neutral",
      },
    });
    const cells = screen.getAllByRole("cell");
    expect(cells.map((cell) => cell.textContent)).toEqual(["Open", "archived"]);
    expect(cells[0].querySelector('[class*="bg-success-solid"]')).not.toBeNull();
    expect(cells[1].querySelector('[class*="bg-secondary"]')).not.toBeNull();
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
  });

  it("keeps badgeLabelMap for badges without a combobox", () => {
    setup({
      ...base,
      typeOptions: { badgeLabelMap: { open: "Open label", archived: "Archived label" } },
    });
    expect(screen.getAllByRole("cell").map((cell) => cell.textContent)).toEqual([
      "Open label",
      "Archived label",
    ]);
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("keeps badgeLabelMap when a different editor is configured", () => {
    setup({
      accessorKey: "status",
      type: "badge",
      label: "Status",
      edit: { editorType: "text", canEdit: (row) => row.allowed },
      typeOptions: { badgeLabelMap: { open: "Open label", archived: "Archived label" } },
    });
    expect(screen.getAllByRole("cell").map((cell) => cell.textContent)).toEqual([
      "Open label",
      "Archived label",
    ]);
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
  });
});
