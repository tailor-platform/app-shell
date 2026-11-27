import { afterEach, describe, expect, it } from "vitest";
import { useState } from "react";
import {
  cleanup,
  createEvent,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { useCollectionVariables } from "@/hooks/use-collection-variables";
import type { SortState } from "@/types/collection";
import { DataTable } from "./data-table";
import { useDataTable, useDataTableContext } from "./index";
import type { Column, DataTableData } from "./types";

afterEach(() => {
  cleanup();
});

type Row = { id: string; name: string; amount: number; status: string };

const columns: Column<Row>[] = [
  { id: "id", label: "ID", render: (r) => r.id },
  { label: "Name", render: (r) => r.name, sort: { field: "name", type: "string" } },
  { label: "Amount", render: (r) => String(r.amount), sort: { field: "amount", type: "number" } },
  { label: "Status", render: (r) => r.status, sort: { field: "status", type: "string" } },
];

const data: DataTableData<Row> = { rows: [{ id: "1", name: "a", amount: 1, status: "draft" }] };

const wrapper = createAppShellWrapper("en");

// Exposes the live sort order so tests assert on state, not on markup.
function SortOrder() {
  const { sortStates } = useDataTableContext();
  return (
    <output data-testid="sort-order">
      {sortStates.map((s) => `${s.field}:${s.direction}`).join(",")}
    </output>
  );
}

function Harness({
  initialSort = [],
  multiple = true,
  sort,
  cols = columns,
}: {
  initialSort?: SortState[];
  multiple?: boolean;
  sort?: false;
  cols?: Column<Row>[];
}) {
  const { control } = useCollectionVariables({ params: { initialSort } });
  const table = useDataTable<Row>({
    columns: cols,
    data,
    control,
    sort: sort ?? (multiple ? { multiple: true } : {}),
  });
  return (
    <DataTable.Root value={table}>
      <DataTable.SortSettings />
      <SortOrder />
      <DataTable.Table />
    </DataTable.Root>
  );
}

const order = () => screen.getByTestId("sort-order").textContent;

// Options in the "Add sort" list, by visible label.
const candidates = (name: string) =>
  within(screen.getByRole("listbox", { name }))
    .queryAllByRole("option")
    .map((el) => el.textContent);
const highlighted = () =>
  screen.getAllByRole("option").find((el) => el.hasAttribute("data-highlighted"))?.textContent;

async function openPopover(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /^sort/i }));
  return screen.getByRole("group", { name: "Sort settings" });
}

describe("DataTable.SortSettings", () => {
  it("renders nothing when sorting is disabled", () => {
    render(<Harness sort={false} />, { wrapper });
    expect(screen.queryByRole("button", { name: /^sort/i })).toBeNull();
  });

  it("shows and clears active keys even when no columns are sortable", async () => {
    const user = userEvent.setup();
    render(
      <Harness cols={[columns[0]]} initialSort={[{ field: "createdAt", direction: "Desc" }]} />,
      { wrapper },
    );
    const popup = await openPopover(user);
    expect(within(popup).getByText("createdAt")).toBeTruthy();
    await user.click(within(popup).getByRole("button", { name: "Clear" }));
    expect(order()).toBe("");
  });

  it("shows the active key count on the trigger", () => {
    render(
      <Harness
        initialSort={[
          { field: "status", direction: "Asc" },
          { field: "amount", direction: "Desc" },
        ]}
      />,
      { wrapper },
    );
    // Same wording as FilterRail's trigger; the visual badge is aria-hidden.
    expect(screen.getByRole("button", { name: "Sort, 2 active" })).toBeTruthy();
  });

  it("lists active keys in priority order with an empty state otherwise", async () => {
    const user = userEvent.setup();
    render(<Harness />, { wrapper });
    const popup = await openPopover(user);
    expect(within(popup).getByText("No sort applied")).toBeTruthy();
  });

  it("adds a key from the list, offering only unsorted sortable columns", async () => {
    const user = userEvent.setup();
    render(<Harness initialSort={[{ field: "name", direction: "Asc" }]} />, { wrapper });
    const popup = await openPopover(user);
    await user.click(within(popup).getByRole("button", { name: "Add another sort" }));

    expect(document.activeElement).toBe(screen.getByRole("combobox", { name: "Search columns" }));
    expect(candidates("Add another sort")).toEqual(["Amount", "Status"]);

    await user.click(
      within(screen.getByRole("listbox", { name: "Add another sort" })).getByRole("option", {
        name: "Status",
      }),
    );
    expect(order()).toBe("name:Asc,status:Asc");
    expect(screen.queryByRole("combobox", { name: "Search columns" })).toBeNull();
  });

  it("filters candidates with a trimmed, case-insensitive search and adds the first match on Enter", async () => {
    const user = userEvent.setup();
    render(<Harness />, { wrapper });
    const popup = await openPopover(user);
    await user.click(within(popup).getByRole("button", { name: "Add sort" }));
    const search = screen.getByRole("combobox", { name: "Search columns" });

    await user.type(search, "  AMO ");
    expect(candidates("Add sort")).toEqual(["Amount"]);

    await user.clear(search);
    await user.type(search, "missing");
    expect(screen.getByText("No columns match")).toBeTruthy();
    await user.keyboard("{Enter}");
    expect(order()).toBe("");

    await user.clear(search);
    await user.type(search, "stat{Enter}");
    expect(order()).toBe("status:Asc");
  });

  it("highlights the first match and moves the highlight with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<Harness />, { wrapper });
    const popup = await openPopover(user);
    await user.click(within(popup).getByRole("button", { name: "Add sort" }));
    const search = screen.getByRole("combobox", { name: "Search columns" });

    await waitFor(() => expect(highlighted()).toBe("Name"));
    await user.keyboard("{ArrowDown}");
    expect(highlighted()).toBe("Amount");

    // Typing re-highlights the first match.
    await user.type(search, "s");
    await waitFor(() => expect(highlighted()).toBe("Status"));

    // Pointer hover is covered by the Chromium test; jsdom doesn't move a pointer.
    await user.clear(search);
    await user.keyboard("{ArrowDown}");
    expect(highlighted()).toBe("Amount");
    expect(document.activeElement).toBe(search);

    await user.keyboard("{Enter}");
    expect(order()).toBe("amount:Asc");
  });

  it("changes direction in place without changing priority", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        initialSort={[
          { field: "status", direction: "Asc" },
          { field: "amount", direction: "Desc" },
        ]}
      />,
      { wrapper },
    );
    const popup = await openPopover(user);
    await user.click(within(popup).getByRole("combobox", { name: "Sort direction for Status" }));
    await user.click(screen.getByRole("option", { name: "Descending" }));
    expect(order()).toBe("status:Desc,amount:Desc");
  });

  it("removes a single key and clears all keys", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        initialSort={[
          { field: "status", direction: "Asc" },
          { field: "amount", direction: "Desc" },
          { field: "name", direction: "Asc" },
        ]}
      />,
      { wrapper },
    );
    const popup = await openPopover(user);
    await user.click(within(popup).getByRole("button", { name: "Remove sort for Amount" }));
    expect(order()).toBe("status:Asc,name:Asc");

    await user.click(within(popup).getByRole("button", { name: "Clear" }));
    expect(order()).toBe("");
  });

  it("reorders priority from the keyboard", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        initialSort={[
          { field: "status", direction: "Asc" },
          { field: "amount", direction: "Desc" },
        ]}
      />,
      { wrapper },
    );
    const popup = await openPopover(user);
    within(popup)
      .getByRole("button", { name: /Reorder sort for Amount \(2 of 2\)/ })
      .focus();
    await user.keyboard("{ArrowUp}");
    expect(order()).toBe("amount:Desc,status:Asc");
    // Already first: another ArrowUp is a no-op.
    await user.keyboard("{ArrowUp}");
    expect(order()).toBe("amount:Desc,status:Asc");
  });

  it("holds one key in single-sort mode, with no reorder handles or add menu", async () => {
    const user = userEvent.setup();
    render(<Harness multiple={false} initialSort={[{ field: "name", direction: "Asc" }]} />, {
      wrapper,
    });
    const popup = await openPopover(user);
    expect(within(popup).queryByRole("button", { name: /Reorder sort/ })).toBeNull();
    expect(within(popup).queryByRole("button", { name: /Add/ })).toBeNull();

    await user.click(within(popup).getByRole("combobox", { name: "Sort direction for Name" }));
    await user.click(screen.getByRole("option", { name: "Descending" }));
    expect(order()).toBe("name:Desc");
  });

  it("preserves persisted multiple keys when changing direction in single-sort mode", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        multiple={false}
        initialSort={[
          { field: "createdAt", direction: "Desc" },
          { field: "name", direction: "Asc" },
        ]}
      />,
      { wrapper },
    );
    const popup = await openPopover(user);
    await user.click(within(popup).getByRole("combobox", { name: "Sort direction for Name" }));
    await user.click(screen.getByRole("option", { name: "Descending" }));
    expect(order()).toBe("createdAt:Desc,name:Desc");
    await user.click(within(popup).getByRole("button", { name: "Clear" }));
    expect(order()).toBe("");
  });

  it("uses one ordered update for hand-built table values", async () => {
    function HandBuilt() {
      const [sortStates, setSortStates] = useState<SortState[]>([
        { field: "createdAt", direction: "Desc" },
        { field: "name", direction: "Asc" },
      ]);
      const table = useDataTable<Row>({ columns, data });
      return (
        <DataTable.Root
          value={{
            ...table,
            sortStates,
            sortMultiple: true,
            onSort: (field, direction) =>
              setSortStates(
                direction
                  ? [...sortStates.filter((s) => s.field !== field), { field, direction }]
                  : sortStates.filter((s) => s.field !== field),
              ),
            onSortStatesChange: setSortStates,
          }}
        >
          <DataTable.SortSettings />
          <SortOrder />
        </DataTable.Root>
      );
    }

    const user = userEvent.setup();
    render(<HandBuilt />, { wrapper });
    const popup = await openPopover(user);
    await user.click(within(popup).getByRole("combobox", { name: "Sort direction for Name" }));
    await user.click(screen.getByRole("option", { name: "Descending" }));
    expect(order()).toBe("createdAt:Desc,name:Desc");
    within(popup)
      .getByRole("button", { name: /Reorder sort for Name/ })
      .focus();
    await user.keyboard("{ArrowUp}");
    expect(order()).toBe("name:Desc,createdAt:Desc");
    await user.click(within(popup).getByRole("button", { name: "Clear" }));
    expect(order()).toBe("");
  });

  it("does not offer unsafe multi-key edits without an atomic callback", async () => {
    const user = userEvent.setup();
    function Legacy() {
      const { control } = useCollectionVariables({
        params: {
          initialSort: [
            { field: "name", direction: "Asc" },
            { field: "status", direction: "Desc" },
          ],
        },
      });
      const table = useDataTable<Row>({
        columns,
        data,
        control: { ...control, setSortStates: undefined },
        sort: { multiple: true },
      });
      return (
        <DataTable.Root value={table}>
          <DataTable.SortSettings />
          <SortOrder />
        </DataTable.Root>
      );
    }
    render(<Legacy />, { wrapper });
    const popup = await openPopover(user);
    expect(within(popup).getByRole("button", { name: "Clear" }).hasAttribute("disabled")).toBe(
      true,
    );
    expect(
      within(popup)
        .getByRole("combobox", { name: "Sort direction for Name" })
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(within(popup).queryByRole("button", { name: /Reorder sort/ })).toBeNull();
    await user.click(within(popup).getByRole("button", { name: "Remove sort for Status" }));
    await user.click(within(popup).getByRole("combobox", { name: "Sort direction for Name" }));
    await user.click(screen.getByRole("option", { name: "Descending" }));
    expect(order()).toBe("name:Desc");
  });

  it("keeps sort keys that have no column when editing the others", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        initialSort={[
          { field: "createdAt", direction: "Desc" },
          { field: "status", direction: "Asc" },
        ]}
      />,
      { wrapper },
    );
    const popup = await openPopover(user);
    // Listed under its field name so it can still be seen and removed.
    expect(within(popup).getByText("createdAt")).toBeTruthy();
    await user.click(within(popup).getByRole("combobox", { name: "Sort direction for Status" }));
    await user.click(screen.getByRole("option", { name: "Descending" }));
    expect(order()).toBe("createdAt:Desc,status:Desc");
  });

  it("offers only sortable columns, once per sort field", async () => {
    const user = userEvent.setup();
    const cols: Column<Row>[] = [
      ...columns,
      { label: "Name (alt)", render: (r) => r.name, sort: { field: "name", type: "string" } },
    ];
    render(<Harness cols={cols} />, { wrapper });
    const popup = await openPopover(user);
    await user.click(within(popup).getByRole("button", { name: "Add sort" }));
    expect(candidates("Add sort")).toEqual(["Name", "Amount", "Status"]);
  });

  describe("drag to reorder", () => {
    const threeKeys: SortState[] = [
      { field: "status", direction: "Asc" },
      { field: "amount", direction: "Desc" },
      { field: "name", direction: "Asc" },
    ];
    const rowOf = (popup: HTMLElement, label: string) =>
      within(popup).getByText(label).closest("li") as HTMLElement;
    // jsdom rects are zero-height, so clientY 0 targets the slot before a row
    // and clientY 1 the slot after it.
    const drag = (from: HTMLElement, to: HTMLElement, after: boolean) => {
      fireEvent.dragStart(from, { dataTransfer: { setData: () => {} } });
      // jsdom drops clientY from drag event init, so set it on the event.
      const over = createEvent.dragOver(to);
      Object.defineProperty(over, "clientY", { value: after ? 1 : 0 });
      fireEvent(to, over);
      fireEvent.drop(to);
      fireEvent.dragEnd(from);
    };

    it("moves a key before the target row", async () => {
      const user = userEvent.setup();
      render(<Harness initialSort={threeKeys} />, { wrapper });
      const popup = await openPopover(user);
      drag(rowOf(popup, "Name"), rowOf(popup, "Status"), false);
      expect(order()).toBe("name:Asc,status:Asc,amount:Desc");
    });

    it("moves a key after the target row, correcting for its own slot", async () => {
      const user = userEvent.setup();
      render(<Harness initialSort={threeKeys} />, { wrapper });
      const popup = await openPopover(user);
      drag(rowOf(popup, "Status"), rowOf(popup, "Amount"), true);
      expect(order()).toBe("amount:Desc,status:Asc,name:Asc");
    });

    it("leaves the order unchanged for a self-drop", async () => {
      const user = userEvent.setup();
      render(<Harness initialSort={threeKeys} />, { wrapper });
      const popup = await openPopover(user);
      drag(rowOf(popup, "Amount"), rowOf(popup, "Amount"), false);
      expect(order()).toBe("status:Asc,amount:Desc,name:Asc");
    });

    it("ignores drops that did not start in the panel", async () => {
      const user = userEvent.setup();
      render(<Harness initialSort={threeKeys} />, { wrapper });
      const popup = await openPopover(user);
      fireEvent.dragOver(rowOf(popup, "Status"), { clientY: 0 });
      fireEvent.drop(rowOf(popup, "Status"));
      expect(order()).toBe("status:Asc,amount:Desc,name:Asc");
    });
  });

  it("keeps focus in the popover when the focused control goes away", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        initialSort={[
          { field: "status", direction: "Asc" },
          { field: "amount", direction: "Desc" },
        ]}
      />,
      { wrapper },
    );
    const popup = await openPopover(user);
    await user.click(within(popup).getByRole("button", { name: "Remove sort for Amount" }));
    await waitFor(() => expect(document.activeElement).toBe(popup));

    await user.click(within(popup).getByRole("button", { name: "Clear" }));
    await waitFor(() => expect(document.activeElement).toBe(popup));
  });
});
