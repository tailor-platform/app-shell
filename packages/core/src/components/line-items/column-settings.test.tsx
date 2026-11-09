import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { Button } from "@/components/button";
import { Toolbar } from "@/components/toolbar";
import { createLineItemHelper } from "./column-helper";
import { LineItems } from "./line-items";
import { useLineItems } from "./use-line-items";
import type { UseLineItemsReturn } from "./types";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
beforeEach(() => localStorage.clear());
type Row = { id?: string; sku: string; quantity: number | null; price: number | null };
const { column } = createLineItemHelper<Row>();
const columns = [
  column({ accessorKey: "sku", label: "SKU", type: "text", width: 100, pin: "left" }),
  column({
    accessorKey: "quantity",
    label: "Qty",
    type: "number",
    edit: { editorType: "number" },
    width: 112,
  }),
  column({
    accessorKey: "price",
    label: "Price",
    type: "money",
    edit: { editorType: "number" },
    width: 144,
  }),
  column({
    id: "amount",
    label: "Amount",
    accessor: (row) => (row.quantity ?? 0) * (row.price ?? 0),
    width: 144,
    pin: "right",
    footer: ({ rows }) =>
      rows.reduce((sum, row) => sum + (row.quantity ?? 0) * (row.price ?? 0), 0),
  }),
];
let current: UseLineItemsReturn<Row>;
function Harness({ tableId }: { tableId?: string }) {
  const value = useLineItems<Row>({
    columns,
    tableId,
    defaultLines: [{ id: "A", sku: "SKU", quantity: 1, price: 10 }],
    rowActions: {
      width: 128,
      render: (row) => (
        <Button size="xs" aria-label={`Remove ${row.sku}`}>
          Remove
        </Button>
      ),
    },
  });
  current = value;
  return (
    <LineItems.Root value={value}>
      <Toolbar.Root>
        <Toolbar.Row justify="between" aria-label="Line actions">
          <Toolbar.Group>
            <Button onClick={() => value.addLine({ sku: "NEW", quantity: 1, price: 1 })}>
              Add
            </Button>
            <Button disabled={!value.hasUnsavedChanges()} onClick={() => value.revert()}>
              Discard
            </Button>
            <Button>Save</Button>
          </Toolbar.Group>
          <Toolbar.Group>
            <LineItems.ColumnSettings />
          </Toolbar.Group>
        </Toolbar.Row>
      </Toolbar.Root>
      <LineItems.Table />
    </LineItems.Root>
  );
}
const wrapper = createAppShellWrapper("en");
function headings(container: HTMLElement) {
  return Array.from(container.querySelectorAll("thead th")).map((cell) => cell.textContent?.trim());
}
function header(container: HTMLElement, name: string) {
  return Array.from(container.querySelectorAll<HTMLElement>("thead th")).find(
    (cell) => cell.textContent === name,
  )!;
}
function openSettings() {
  fireEvent.click(screen.getByRole("button", { name: "Columns" }));
  return document.querySelector<HTMLElement>('[data-slot="line-items-column-settings-popup"]')!;
}

describe("LineItems column preferences", () => {
  it("uses one Root context, with no filter/visibility controls", () => {
    render(<Harness />, { wrapper });
    const panel = openSettings();
    expect(panel.querySelector('[data-section="left"]')?.textContent).toContain("SKU");
    expect(panel.querySelector('[data-section="right"]')?.textContent).toContain("Amount");
    expect(within(panel).queryByRole("checkbox")).toBeNull();
    expect(within(panel).queryByRole("button", { name: "Hide all" })).toBeNull();
    expect(screen.queryByText("Filters")).toBeNull();
    for (const row of Array.from(panel.querySelectorAll('[draggable="true"]'))) {
      expect(row.children).toHaveLength(2);
      expect(row.querySelectorAll("button")).toHaveLength(1);
    }
    expect(
      within(panel).queryByRole("button", { name: /Column actions|Move .* (up|down)/ }),
    ).toBeNull();
    expect(() => render(<LineItems.ColumnSettings />, { wrapper })).toThrow(
      /inside LineItems.Root/,
    );
  });
  it("fixes Amount next to Actions consistently in header/body/footer", () => {
    const { container } = render(<Harness />, { wrapper });
    const index = headings(container).indexOf("Amount");
    expect(header(container, "Amount").style.right).toBe("128px");
    expect(
      container.querySelector<HTMLTableRowElement>("tbody tr")!.cells[index]!.style.right,
    ).toBe("128px");
    expect(
      container.querySelector<HTMLTableRowElement>("tfoot tr")!.cells[index]!.style.right,
    ).toBe("128px");
  });
  it("moves columns with keyboard-accessible controls without editing the document", () => {
    const { container } = render(<Harness />, { wrapper });
    const original = current.allLines;
    const panel = openSettings();
    fireEvent.keyDown(within(panel).getByRole("button", { name: "Reorder Qty" }), {
      key: "ArrowDown",
    });
    expect(headings(container)).toEqual(["Reorder", "SKU", "Price", "Qty", "Amount", "Actions"]);
    expect(current.allLines).toBe(original);
    expect(current.isDirty).toBe(false);
    expect(current.getChangeSet().isEmpty).toBe(true);
  });
  it("keeps keyboard pinning on the grip and restores the column default with null", () => {
    const { container } = render(<Harness />, { wrapper });
    const panel = openSettings();
    fireEvent.keyDown(within(panel).getByRole("button", { name: "Reorder Amount" }), {
      key: "ArrowLeft",
    });
    expect(header(container, "Amount").style.position).toBe("");
    expect(current.pinnedColumns.amount).toBe("none");
    expect(document.activeElement).not.toBe(document.body);
    act(() => current.setPin("amount", null));
    expect(header(container, "Amount").style.right).toBe("128px");
    expect(current.isDirty).toBe(false);
  });
  it("drags across zones and supports multiple right pins in display order", () => {
    const { container } = render(<Harness />, { wrapper });
    const panel = openSettings();
    const price = within(panel).getByText("Price").closest('[draggable="true"]')!;
    const right = panel.querySelector<HTMLElement>('[data-section="right"]')!;
    fireEvent.dragStart(price);
    fireEvent.dragOver(right);
    fireEvent.drop(right);
    expect(headings(container)).toEqual(["Reorder", "SKU", "Qty", "Amount", "Price", "Actions"]);
    expect(header(container, "Price").style.right).toBe("128px");
    expect(header(container, "Amount").style.right).toBe("272px");
    expect(current.isDirty).toBe(false);
  });
  it("preserves drafts and their errors while moving/pinning columns", async () => {
    const { container } = render(<Harness />, { wrapper });
    const input = screen.getByRole("textbox", { name: "Qty, line 1" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "--" } });
    fireEvent.keyDown(input, { key: "Enter" });
    act(() => {
      current.moveColumn("quantity", 0);
      current.setPin("quantity", "right");
    });
    expect(container.querySelector('input[aria-label="Qty, line 1"]')).toBe(input);
    expect((input as HTMLInputElement).value).toBe("--");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    await act(async () => {
      expect(await current.commitEdits()).toBeNull();
    });
    expect(current.getChangeSet().isEmpty).toBe(true);
  });
  it("retains preferences through Discard, successful save and remount", () => {
    const view = render(<Harness tableId="orders" />, { wrapper });
    act(() => {
      current.moveColumn("price", 0);
      current.setPin("amount", "none");
      current.updateField("A", "quantity", 2);
      current.revert();
    });
    const expected = [...current.columnOrder];
    expect(current.pinnedColumns.amount).toBe("none");
    act(() => {
      current.updateField("A", "quantity", 3);
      const sent = current.getChangeSet();
      current.reset(undefined, { sent });
    });
    expect(current.columnOrder).toEqual(expected);
    expect(current.isDirty).toBe(false);
    view.unmount();
    render(<Harness tableId="orders" />, { wrapper });
    expect(current.columnOrder).toEqual(expected);
    expect(current.pinnedColumns.amount).toBe("none");
  });
  it("opens the DataTable-style header menu and copies the label", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    const { container } = render(<Harness />, { wrapper });
    const trigger = header(container, "Amount").querySelector<HTMLElement>(
      '[data-slot="line-items-header-context-menu-trigger"]',
    )!;
    fireEvent.contextMenu(trigger);
    expect(screen.getByRole("menuitem", { name: "Pin column" })).toBeDefined();
    expect(screen.queryByRole("menuitem", { name: "Sort column" })).toBeNull();
    expect(screen.queryByRole("menuitem", { name: "Hide column" })).toBeNull();
    expect(
      header(container, "Actions").querySelector(
        '[data-slot="line-items-header-context-menu-trigger"]',
      ),
    ).toBeNull();
    await user.click(screen.getByRole("menuitem", { name: "Copy label" }));
    expect(writeText).toHaveBeenCalledWith("Amount");
  });
  it("pins and unpins through the header submenu without changing the document", async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness tableId="header-pins" />, { wrapper });
    const trigger = header(container, "Qty").querySelector<HTMLElement>(
      '[data-slot="line-items-header-context-menu-trigger"]',
    )!;
    const openPinMenu = () => {
      fireEvent.contextMenu(trigger);
      const item = screen.getByRole("menuitem", { name: "Pin column" });
      fireEvent.mouseEnter(item);
      fireEvent.mouseMove(item);
      fireEvent.pointerMove(item);
    };
    openPinMenu();
    await user.click(await screen.findByRole("menuitem", { name: "Pin to right" }));
    expect(header(container, "Qty").style.right).toBe("272px");
    expect(current.pinnedColumns.quantity).toBe("right");
    expect(
      header(container, "Qty").querySelector(
        '[data-slot="line-items-header-context-menu-trigger"]',
      ),
    ).toBe(trigger);
    openPinMenu();
    expect(
      (await screen.findByRole("menuitem", { name: "Pin to right" })).getAttribute("aria-disabled"),
    ).toBe("true");
    await user.click(screen.getByRole("menuitem", { name: "Unpin" }));
    expect(header(container, "Qty").style.position).toBe("");
    expect(current.pinnedColumns.quantity).toBe("none");
    expect(current.getChangeSet().isEmpty).toBe(true);
    expect(current.isDirty).toBe(false);
    expect(JSON.parse(localStorage.getItem("as:line-items:v1:header-pins")!).pinned.quantity).toBe(
      "none",
    );
  });
  it("opens the header menu with Shift+F10 and returns focus on Escape", async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />, { wrapper });
    const trigger = header(container, "Amount").querySelector<HTMLElement>(
      '[data-slot="line-items-header-context-menu-trigger"]',
    )!;
    trigger.focus();
    await user.keyboard("{Shift>}{F10}{/Shift}");
    expect(screen.getByRole("menuitem", { name: "Copy label" })).toBeDefined();
    await user.keyboard("{Escape}");
    expect(document.activeElement).toBe(trigger);
  });
  it("registers the Columns trigger in the generic toolbar's navigation", async () => {
    const user = userEvent.setup();
    render(<Harness />, { wrapper });
    const add = screen.getByRole("button", { name: "Add" });
    add.focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Save" }));
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Columns" }));
  });
});
