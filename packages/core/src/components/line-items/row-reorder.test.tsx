import { useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { createLineItemHelper } from "./column-helper";
import { LineItems } from "./line-items";
import { useLineItems } from "./use-line-items";
import type { UseLineItemsReturn } from "./types";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
type Row = { id?: string; name: string | null };
const { column } = createLineItemHelper<Row>();
const columns = [
  column({
    accessorKey: "name",
    label: "Name",
    pin: "left",
    edit: { editorType: "text" },
    footer: ({ rows }) => `${rows.length} lines`,
  }),
];
const initial = [
  { id: "A", name: "Match A" },
  { id: "B", name: "Other" },
  { id: "C", name: "Match C" },
];
let current: UseLineItemsReturn<Row>;
function Harness({
  orderer,
  lines = initial,
  selection = false,
}: {
  orderer?: "manual" | "readonly";
  lines?: Row[];
  selection?: boolean;
}) {
  const [selectedIds, onChange] = useState<string[]>([]);
  current = useLineItems<Row>({
    columns,
    defaultLines: lines,
    orderer,
    rowSelection: selection ? { selectedIds, onChange } : undefined,
  });
  return (
    <LineItems.Root value={current}>
      <LineItems.Table />
    </LineItems.Root>
  );
}
const order = () => current.allLines.map((row) => row.id);
const handle = (index: number) => screen.getByRole("button", { name: `Reorder line ${index}` });
function startDrag(button: HTMLElement) {
  const dataTransfer = { setData: vi.fn(), effectAllowed: "", dropEffect: "" };
  fireEvent.dragStart(button, { dataTransfer });
  return dataTransfer;
}
function dropOn(button: HTMLElement, after: boolean, dataTransfer: ReturnType<typeof startDrag>) {
  const row = button.closest("tr")!;
  vi.spyOn(row, "getBoundingClientRect").mockReturnValue({ top: 100, height: 40 } as DOMRect);
  const clientY = after ? 130 : 110;
  // Happy DOM's DragEvent omits mouse coordinates; supply coordinate-bearing native events.
  for (const type of ["dragover", "drop"]) {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientY });
    Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
    fireEvent(row, event);
  }
}

describe("LineItems standard row reordering", () => {
  it("adds a fixed-left utility column without rowActions or draggable editors", () => {
    const { container } = render(<Harness />, { wrapper: createAppShellWrapper("en") });
    expect(screen.getAllByRole("button", { name: /Reorder line/ })).toHaveLength(3);
    expect(handle(1).getAttribute("draggable")).toBe("true");
    expect(handle(1).closest("tr")!.hasAttribute("draggable")).toBe(false);
    expect(screen.getByRole("textbox", { name: "Name, line 1" }).hasAttribute("draggable")).toBe(
      false,
    );
    const col = container.querySelector("col")!;
    expect(col.getAttribute("data-column-id")).toBe("__line_items_reorder__");
    expect(col.style.width).toBe("44px");
    const heads = container.querySelectorAll("thead th");
    expect((heads[0] as HTMLElement).style.left).toBe("0px");
    expect((heads[1] as HTMLElement).style.left).toBe("44px");
    expect(container.querySelectorAll("tfoot td")).toHaveLength(2);
  });

  it.each([undefined, "manual"] as const)(
    "supports keyboard reordering and focus with orderer=%s",
    async (orderer) => {
      render(<Harness orderer={orderer} />, { wrapper: createAppShellWrapper("en") });
      const button = handle(2);
      await userEvent.click(button);
      await userEvent.keyboard("{ArrowUp}");
      expect(order()).toEqual(["B", "A", "C"]);
      expect(current.getChangeSet().order).toEqual([
        { lineId: "B" },
        { lineId: "A" },
        { lineId: "C" },
      ]);
      expect(screen.getByText("Line 2 moved to position 1.")).toBeDefined();
      expect(document.activeElement).toBe(button);
      await userEvent.keyboard("{ArrowUp}");
      expect(order()).toEqual(["B", "A", "C"]);
      await userEvent.keyboard("{ArrowDown}");
      expect(order()).toEqual(["A", "B", "C"]);
      expect(current.isDirty).toBe(false);
    },
  );

  it.each([false, true])(
    "drops before/after the target using the row midpoint (after=%s)",
    async (after) => {
      render(<Harness />, { wrapper: createAppShellWrapper("en") });
      const source = handle(3);
      const input = screen.getByRole("textbox", { name: "Name, line 3" });
      const transfer = startDrag(source);
      expect(transfer.setData).toHaveBeenCalledWith("text/plain", expect.any(String));
      dropOn(handle(1), after, transfer);
      expect(order()).toEqual(after ? ["A", "C", "B"] : ["C", "A", "B"]);
      expect(screen.getByRole("textbox", { name: `Name, line ${after ? 2 : 1}` })).toBe(input);
      await waitFor(() => expect(document.activeElement).toBe(source));
      expect(source.closest("tr")!.getAttribute("data-dragging")).toBeNull();
      await act(async () => {
        expect((await current.commitEdits())?.order).toEqual(order().map((id) => ({ lineId: id })));
      });
      act(() => current.revert());
      expect(order()).toEqual(["A", "B", "C"]);
      expect(current.hasUnsavedChanges()).toBe(false);
    },
  );

  it("uses full-document anchors while dragging or using arrow keys through search matches", () => {
    render(<Harness />, { wrapper: createAppShellWrapper("en") });
    act(() => current.setSearchQuery("Match"));
    const transfer = startDrag(handle(1));
    dropOn(handle(3), true, transfer);
    expect(order()).toEqual(["B", "C", "A"]);
    expect(current.lines.map((row) => row.id)).toEqual(["C", "A"]);
    fireEvent.keyDown(handle(3), { key: "ArrowUp" });
    expect(order()).toEqual(["B", "A", "C"]);
    expect(screen.getByText("3 lines")).toBeDefined();
  });

  it("resolves current IDs when a dragged creation is acknowledged", () => {
    render(<Harness />, { wrapper: createAppShellWrapper("en") });
    let key!: string;
    act(() => {
      key = current.addLine({ name: "New" });
    });
    const sent = current.getChangeSet();
    const source = handle(4);
    const transfer = startDrag(source);
    act(() => current.reset({ idMap: { [key]: "N" } }, { sent }));
    expect(handle(4)).toBe(source);
    dropOn(handle(1), true, transfer);
    expect(order()).toEqual(["A", "N", "B", "C"]);
    expect(current.getChangeSet().lineChanges).toEqual([]);
    expect(current.getChangeSet().order).toEqual([
      { lineId: "A" },
      { lineId: "N" },
      { lineId: "B" },
      { lineId: "C" },
    ]);
  });

  it("ignores external, canceled, or removed-source drops", () => {
    render(<Harness />, { wrapper: createAppShellWrapper("en") });
    const transfer = { setData: vi.fn(), effectAllowed: "", dropEffect: "" };
    dropOn(handle(1), true, transfer);
    expect(current.isDirty).toBe(false);
    const source = handle(3);
    startDrag(source);
    fireEvent.dragEnd(source);
    dropOn(handle(1), true, transfer);
    expect(current.isDirty).toBe(false);
    startDrag(source);
    act(() => current.removeLine("C"));
    dropOn(handle(1), true, transfer);
    expect(order()).toEqual(["A", "B"]);
    expect(current.getChangeSet().order).toEqual([{ lineId: "A" }, { lineId: "B" }]);
  });

  it("hides handles with readonly orderer, cancels an interrupted drag, and disables a single row", () => {
    const view = render(<Harness />, { wrapper: createAppShellWrapper("en") });
    const transfer = startDrag(handle(3));
    view.rerender(<Harness orderer="readonly" />);
    expect(screen.queryAllByRole("button", { name: /Reorder line/ })).toHaveLength(0);
    view.rerender(<Harness />);
    dropOn(handle(1), true, transfer);
    expect(current.isDirty).toBe(false);
    view.unmount();
    render(<Harness lines={[initial[0]!]} />, { wrapper: createAppShellWrapper("en") });
    expect((handle(1) as HTMLButtonElement).disabled).toBe(true);
    expect(handle(1).getAttribute("draggable")).toBe("false");
  });

  it("keeps selection first and fixed left in header, body, and footer regardless of pin/order preferences", () => {
    const view = render(<Harness selection />, { wrapper: createAppShellWrapper("en") });
    act(() => {
      current.setPin("name", "right");
      current.setColumnOrder(["name", "selection", "__line_items_reorder__"]);
    });
    expect(current.columnOrder).toEqual(["name"]);
    const cols = view.container.querySelectorAll("col");
    expect(cols[0]!.getAttribute("data-column-id")).toBe("__line_items_selection__");
    expect(cols[1]!.getAttribute("data-column-id")).toBe("__line_items_reorder__");
    for (const selector of ["thead tr", "tbody tr", "tfoot tr"]) {
      const cells = view.container.querySelector(selector)!.children;
      expect((cells[0] as HTMLElement).style.left).toBe("0px");
      expect((cells[1] as HTMLElement).style.left).toBe("44px");
    }
    act(() => current.setPin("name", "left"));
    const name = screen.getByRole("textbox", { name: "Name, line 1" }).closest("td")!;
    expect(name.style.left).toBe("88px");
    view.rerender(<Harness selection orderer="readonly" />);
    expect(screen.getByRole("checkbox", { name: "Select all visible lines" })).toBeDefined();
    expect((view.container.querySelector("thead th") as HTMLElement).style.left).toBe("0px");
  });

  it("keeps controlled selection independent of drafts and selects only visible rows", async () => {
    render(<Harness selection />, { wrapper: createAppShellWrapper("en") });
    await userEvent.click(screen.getByRole("checkbox", { name: "Select line 2" }));
    expect(current.isDirty).toBe(false);
    act(() => current.setSearchQuery("Match"));
    await userEvent.click(screen.getByRole("checkbox", { name: "Select all visible lines" }));
    expect(
      screen.getByRole("checkbox", { name: "Select line 1" }).getAttribute("aria-checked"),
    ).toBe("true");
    expect(
      screen.getByRole("checkbox", { name: "Select line 3" }).getAttribute("aria-checked"),
    ).toBe("true");
    await userEvent.click(screen.getByRole("checkbox", { name: "Select all visible lines" }));
    act(() => current.setSearchQuery(""));
    expect(
      screen.getByRole("checkbox", { name: "Select line 2" }).getAttribute("aria-checked"),
    ).toBe("true");
    expect(
      screen
        .getByRole("checkbox", { name: "Select all visible lines" })
        .getAttribute("aria-checked"),
    ).toBe("mixed");
    expect(current.hasUnsavedChanges()).toBe(false);
    act(() => current.setSearchQuery("Nothing matches"));
    expect(
      screen
        .getByRole("checkbox", { name: "Select all visible lines" })
        .getAttribute("data-disabled"),
    ).not.toBeNull();
  });

  it("localizes the handle and keyboard hint in Japanese", () => {
    render(<Harness />, { wrapper: createAppShellWrapper("ja") });
    expect(screen.getByRole("button", { name: "行1を並び替え" })).toBeDefined();
    expect(screen.getByText("ドラッグ、または上下矢印キーで並び替えます。")).toBeDefined();
  });
});
