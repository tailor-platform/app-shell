import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { Button } from "@/components/button";
import { Toolbar } from "@/components/toolbar";
import { LineItems } from "./line-items";
import { createLineItemHelper } from "./column-helper";
import { useLineItems } from "./use-line-items";
import type { UseLineItemsReturn } from "./types";

afterEach(cleanup);
type Row = { id: string; name: string | null; quantity: number | null; hidden?: string };
const { column } = createLineItemHelper<Row>();
const columns = [
  column({ accessorKey: "name", label: "Name", edit: { editorType: "text" } }),
  column({
    accessorKey: "quantity",
    label: "Qty",
    type: "number",
    edit: { editorType: "number" },
    validate: (value) => (value !== null && value > 0 ? null : "Positive quantity required"),
    footer: ({ rows }) => rows.reduce((sum, row) => sum + (row.quantity ?? 0), 0),
  }),
  column({ id: "computed", label: "Code", accessor: (row) => `computed-${row.id}` }),
];
const rows: Row[] = [
  { id: "A", name: "One", quantity: 1, hidden: "SECRET" },
  { id: "B", name: "Two", quantity: 2 },
  { id: "C", name: "Three", quantity: 3 },
];
let current: UseLineItemsReturn<Row>;
function Harness({ initial = rows }: { initial?: readonly Row[] }) {
  const value = useLineItems<Row>({
    columns,
    defaultLines: initial,
    ordering: "manual",
    rowActions: {
      render: (_row, { lineKey, index }) => (
        <Button
          aria-label={`Move ${lineKey} up`}
          disabled={index === 0}
          onClick={() => {
            const after = current.allLines[index - 2];
            current.reorderLine(lineKey, after ? current.getLineKey(after) : null);
          }}
        >
          Move {index}
        </Button>
      ),
    },
  });
  current = value;
  return (
    <LineItems.Root value={value}>
      <Toolbar.Root>
        <Toolbar.Row aria-label="Line controls">
          <Toolbar.Group>
            <Button>Add</Button>
            <LineItems.Search />
            <LineItems.ColumnSettings />
          </Toolbar.Group>
        </Toolbar.Row>
      </Toolbar.Root>
      <LineItems.Table aria-label="Lines" />
    </LineItems.Root>
  );
}
const wrapper = createAppShellWrapper("en");
const searchInput = () => screen.getByRole("textbox", { name: "Search line items" });
const search = (query: string) => fireEvent.change(searchInput(), { target: { value: query } });
const ids = () => current.lines.map((row) => row.id);

describe("LineItems.Search", () => {
  it("filters incrementally across columns, clears without document writes, and retains footer totals", () => {
    const view = render(<Harness />, { wrapper });
    const all = current.allLines;
    expect(searchInput().getAttribute("type")).toBe("text");
    search(" ＴＷＯ ");
    expect(ids()).toEqual(["B"]);
    expect(screen.getByRole("textbox", { name: "Name, line 2" })).toBeDefined();
    expect(screen.queryByRole("textbox", { name: "Name, line 1" })).toBeNull();
    expect(current.searchQuery).toBe(" ＴＷＯ ");
    expect(current.allLines).toBe(all);
    expect(current.isDirty).toBe(false);
    expect(current.hasUnsavedChanges()).toBe(false);
    expect(current.getChangeSet().isEmpty).toBe(true);
    expect(view.container.querySelector("tfoot")?.textContent).toContain("6");
    const searchControl = searchInput().closest<HTMLElement>('[data-slot="line-items-search"]')!;
    expect(within(searchControl).getByRole("status").textContent).toBe("1 of 3 lines shown.");
    search("computed-c");
    expect(ids()).toEqual(["C"]);
    search("secret");
    expect(ids()).toEqual([]);
    expect(screen.getByText("No matching lines.")).toBeDefined();
    search("");
    expect(current.lines).toBe(current.allLines);
    expect(ids()).toEqual(["A", "B", "C"]);
  });
  it("filters adopted values after updates/adds and retains the query through Discard/save", async () => {
    render(<Harness />, { wrapper });
    search("Two");
    act(() => current.updateField("A", "name", "Two more"));
    expect(ids()).toEqual(["A", "B"]);
    act(() => current.addLine({ id: "new", name: "Two new", quantity: 1 }));
    expect(current.lines).toHaveLength(3);
    act(() => current.revert());
    expect(current.searchQuery).toBe("Two");
    expect(ids()).toEqual(["B"]);
    act(() => current.updateField("B", "quantity", 5));
    let sent!: Awaited<ReturnType<typeof current.commitEdits>>;
    await act(async () => {
      sent = await current.commitEdits();
    });
    act(() => current.reset(undefined, { sent: sent! }));
    expect(current.searchQuery).toBe("Two");
    expect(current.isDirty).toBe(false);
    search("");
    expect(current.allLines.find((row) => row.id === "B")?.quantity).toBe(5);
  });
  it("prepares hidden drafts and validates the entire document, not just matches", async () => {
    render(<Harness />, { wrapper });
    const input = screen.getByRole("textbox", { name: "Qty, line 2" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "20" } });
    act(() => current.setSearchQuery("One"));
    expect(ids()).toEqual(["A"]);
    expect(current.getChangeSet().isEmpty).toBe(true);
    expect(current.hasUnsavedChanges()).toBe(true);
    await act(async () => {
      const sent = await current.commitEdits();
      expect(sent?.lineChanges).toEqual([
        { action: "update", lineId: "B", patch: { quantity: 20 } },
      ]);
    });
    act(() => current.updateField("C", "quantity", -1));
    expect(current.errors.some((error) => error.lineKey === "C")).toBe(true);
    await act(async () => {
      expect(await current.commitEdits()).toBeNull();
    });
  });
  it("preserves failed hidden drafts until the search is cleared", async () => {
    render(<Harness />, { wrapper });
    const input = screen.getByRole("textbox", { name: "Qty, line 2" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "--" } });
    fireEvent.keyDown(input, { key: "Enter" });
    act(() => current.setSearchQuery("One"));
    expect(screen.queryByRole("textbox", { name: "Qty, line 2" })).toBeNull();
    await act(async () => {
      expect(await current.commitEdits()).toBeNull();
    });
    act(() => current.setSearchQuery(""));
    const restored = screen.getByRole("textbox", { name: "Qty, line 2" }) as HTMLInputElement;
    expect(restored.value).toBe("--");
    expect(restored.getAttribute("aria-invalid")).toBe("true");
    expect(current.getChangeSet().isEmpty).toBe(true);
  });
  it("uses full-document action indexes and includes hidden rows in manual ordering", async () => {
    render(<Harness />, { wrapper });
    search("Two");
    const button = screen.getByRole("button", { name: "Move B up" });
    expect(button.textContent).toBe("Move 1");
    expect((button as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(button);
    expect(current.allLines.map((row) => row.id)).toEqual(["B", "A", "C"]);
    expect(current.getChangeSet().order).toEqual([
      { lineId: "B" },
      { lineId: "A" },
      { lineId: "C" },
    ]);
  });
  it("uses Root context and joins Toolbar without intercepting input caret keys", async () => {
    const user = userEvent.setup();
    render(<Harness />, { wrapper });
    const toolbar = screen.getByRole("toolbar", { name: "Line controls" });
    expect(within(toolbar).getByRole("textbox")).toBe(searchInput());
    screen.getByRole("button", { name: "Add" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(searchInput());
    await user.keyboard("One{ArrowLeft}{Home}{End}");
    expect(document.activeElement).toBe(searchInput());
    expect(current.searchQuery).toBe("One");
    expect(() => render(<LineItems.Search />, { wrapper })).toThrow(/inside LineItems.Root/);
  });
  it("localizes the label and empty state", () => {
    render(<Harness initial={[]} />, { wrapper: createAppShellWrapper("ja") });
    expect(screen.getByRole("textbox", { name: "明細を検索" }).getAttribute("placeholder")).toBe(
      "明細を検索...",
    );
    expect(screen.getByText("明細がありません。")).toBeDefined();
  });
});
