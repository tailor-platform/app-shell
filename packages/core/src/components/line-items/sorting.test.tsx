import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { createLineItemHelper } from "./column-helper";
import { getLineItemsController } from "./controller";
import { LineItems } from "./line-items";
import { useLineItems } from "./use-line-items";
import type { LineItemsColumn, UseLineItemsReturn } from "./types";

afterEach(cleanup);
type Row = { id?: string; name: string | null; quantity: number | null };
const { column } = createLineItemHelper<Row>();
const columns = [
  column({
    accessorKey: "name",
    label: "Name",
    edit: { editorType: "text" },
    sort: { comparator: (a, b) => (a.name ?? "").localeCompare(b.name ?? "") },
  }),
  column({
    accessorKey: "quantity",
    label: "Quantity",
    edit: { editorType: "number" },
    sort: { comparator: (a, b) => (a.quantity ?? 0) - (b.quantity ?? 0) },
  }),
];
const initial: Row[] = [
  { id: "A", name: "Charlie", quantity: 2 },
  { id: "B", name: "Alpha", quantity: 3 },
  { id: "C", name: "Bravo", quantity: 2 },
];
let current: UseLineItemsReturn<Row>;
function Harness({
  orderer,
  schema = columns,
}: {
  orderer?: "manual" | "readonly";
  schema?: readonly LineItemsColumn<Row>[];
}) {
  current = useLineItems<Row>({ columns: schema, defaultLines: initial, orderer });
  return (
    <LineItems.Root value={current}>
      <LineItems.Table />
    </LineItems.Root>
  );
}
const order = () => current.allLines.map((row) => row.id);
const header = (name: string) => screen.getByRole("button", { name });
const direction = (name: string) => header(name).closest("th")!.getAttribute("aria-sort");
const handle = (index: number) => screen.getByRole("button", { name: `Reorder line ${index}` });

describe("LineItems column sorting and manual order", () => {
  it("sorts stably in readonly orderer without dirtying the document, then cycles back", async () => {
    render(<Harness orderer="readonly" />, { wrapper: createAppShellWrapper("en") });
    expect(screen.queryByRole("button", { name: /Reorder line/ })).toBeNull();
    expect(screen.getByRole("textbox", { name: "Name, line 1" })).toBeDefined();
    await userEvent.click(header("Quantity"));
    expect(order()).toEqual(["A", "C", "B"]);
    expect(direction("Quantity")).toBe("ascending");
    expect(current.hasUnsavedChanges()).toBe(false);
    expect(current.getChangeSet()).toEqual({ isEmpty: true, lineChanges: [] });
    await userEvent.click(header("Quantity"));
    expect(order()).toEqual(["B", "A", "C"]);
    expect(direction("Quantity")).toBe("descending");
    await userEvent.click(header("Quantity"));
    expect(order()).toEqual(["A", "B", "C"]);
    expect(direction("Quantity")).toBeNull();
  });

  it("moves from the sorted readonly order to manual order without resetting drafts or sort precedence", async () => {
    const view = render(<Harness orderer="readonly" />, { wrapper: createAppShellWrapper("en") });
    await userEvent.click(header("Name"));
    expect(order()).toEqual(["B", "C", "A"]);
    view.rerender(<Harness />);
    const input = screen.getByRole("textbox", { name: "Quantity, line 2" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "7" } });
    const moved = handle(2);
    fireEvent.keyDown(moved, { key: "ArrowUp" });
    expect(order()).toEqual(["C", "B", "A"]);
    expect(direction("Name")).toBeNull();
    expect(screen.getByRole("textbox", { name: "Quantity, line 1" })).toBe(input);
    expect((input as HTMLInputElement).value).toBe("7");
    expect(document.activeElement).toBe(moved);
    await act(async () => {
      const sent = await current.commitEdits();
      expect(sent?.order).toEqual([{ lineId: "C" }, { lineId: "B" }, { lineId: "A" }]);
      expect(sent?.lineChanges).toEqual([
        { action: "update", lineId: "C", patch: { quantity: 7 } },
      ]);
    });
    expect(order()).toEqual(["C", "B", "A"]);
    await userEvent.click(header("Name"));
    expect(order()).toEqual(["B", "C", "A"]);
    expect(direction("Name")).toBe("ascending");
  });

  it("clears sorting when a manual move restores the already adopted order", async () => {
    render(<Harness />, { wrapper: createAppShellWrapper("en") });
    await userEvent.click(header("Quantity"));
    expect(order()).toEqual(["A", "C", "B"]);
    fireEvent.keyDown(handle(2), { key: "ArrowDown" });
    expect(order()).toEqual(["A", "B", "C"]);
    expect(direction("Quantity")).toBeNull();
    expect(current.isDirty).toBe(false);
    expect(current.getChangeSet()).toEqual({ isEmpty: true, lineChanges: [] });
  });

  it("retains pending manual order through readonly toggles and presentation sorting", async () => {
    const view = render(<Harness />, { wrapper: createAppShellWrapper("en") });
    act(() => current.reorderLine("C", null));
    const sent = current.getChangeSet();
    view.rerender(<Harness orderer="readonly" />);
    expect(() => current.reorderLine("A", null)).toThrow(/disabled/);
    expect(current.isDirty).toBe(true);
    expect(current.getChangeSet()).toEqual(sent);
    await userEvent.click(header("Name"));
    expect(order()).toEqual(["B", "C", "A"]);
    expect(current.getChangeSet()).toEqual(sent);
    view.rerender(<Harness />);
    expect(current.getChangeSet()).toEqual(sent);
    await userEvent.click(header("Name"));
    await userEvent.click(header("Name"));
    expect(order()).toEqual(["C", "A", "B"]);
    act(() => current.revert());
    expect(order()).toEqual(["A", "B", "C"]);
    expect(current.hasUnsavedChanges()).toBe(false);
  });

  it("adopts the complete sorted order when moving through search matches", async () => {
    render(<Harness />, { wrapper: createAppShellWrapper("en") });
    await userEvent.click(header("Name"));
    act(() => current.setSearchQuery("2"));
    expect(current.lines.map((row) => row.id)).toEqual(["C", "A"]);
    fireEvent.keyDown(handle(3), { key: "ArrowUp" });
    expect(order()).toEqual(["B", "A", "C"]);
    expect(current.lines.map((row) => row.id)).toEqual(["A", "C"]);
    expect(direction("Name")).toBeNull();
    expect(current.getChangeSet().order).toEqual([
      { lineId: "B" },
      { lineId: "A" },
      { lineId: "C" },
    ]);
  });

  it("replaces or removes the active column comparator without adopting its order", async () => {
    const view = render(<Harness />, { wrapper: createAppShellWrapper("en") });
    await userEvent.click(header("Name"));
    view.rerender(
      <Harness
        schema={[
          column({
            ...columns[0],
            sort: { comparator: (a, b) => (b.name ?? "").localeCompare(a.name ?? "") },
          }),
          columns[1],
        ]}
      />,
    );
    expect(order()).toEqual(["A", "C", "B"]);
    view.rerender(<Harness schema={[column({ ...columns[0], sort: undefined }), columns[1]]} />);
    expect(order()).toEqual(["A", "B", "C"]);
    expect(screen.queryByRole("button", { name: "Name" })).toBeNull();
    expect(getLineItemsController(current).getSortState()).toBeUndefined();
    expect(current.isDirty).toBe(false);
  });

  it("supports the shared sort menu with keyboard entry and focus restoration", async () => {
    render(<Harness orderer="readonly" />, { wrapper: createAppShellWrapper("en") });
    const trigger = header("Name").closest(
      '[data-slot="line-items-header-context-menu-trigger"]',
    ) as HTMLElement;
    trigger.focus();
    await userEvent.keyboard("{Shift>}{F10}{/Shift}");
    const sortMenu = screen.getByRole("menuitem", { name: "Sort column" });
    fireEvent.mouseEnter(sortMenu);
    fireEvent.mouseMove(sortMenu);
    fireEvent.pointerMove(sortMenu);
    await userEvent.click(await screen.findByRole("menuitem", { name: "Descending" }));
    expect(order()).toEqual(["A", "C", "B"]);
    expect(direction("Name")).toBe("descending");
    expect(document.activeElement).toBe(trigger);
    expect(current.isDirty).toBe(false);
  });

  it("leaves order and sort state untouched when a comparator fails", () => {
    render(
      <Harness
        schema={[
          column({
            ...columns[0],
            sort: {
              comparator: () => {
                throw new Error("Invalid comparator");
              },
            },
          }),
          columns[1],
        ]}
      />,
      { wrapper: createAppShellWrapper("en") },
    );
    const controller = getLineItemsController(current);
    expect(() => controller.setSort("name", "Asc")).toThrow("Invalid comparator");
    expect(controller.getSortState()).toBeUndefined();
    expect(order()).toEqual(["A", "B", "C"]);
    expect(current.isDirty).toBe(false);
  });
});
