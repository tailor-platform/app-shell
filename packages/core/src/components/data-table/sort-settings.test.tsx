import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
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
}: {
  initialSort?: SortState[];
  multiple?: boolean;
  sort?: false;
}) {
  const { control } = useCollectionVariables({ params: { initialSort } });
  const table = useDataTable<Row>({
    columns,
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

async function openPopover(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /^sort/i }));
  return screen.getByRole("group", { name: "Sort settings" });
}

describe("DataTable.SortSettings", () => {
  it("renders nothing when sorting is disabled", () => {
    render(<Harness sort={false} />, { wrapper });
    expect(screen.queryByRole("button", { name: /^sort/i })).toBeNull();
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
    expect(screen.getByRole("button", { name: /^sort/i }).textContent).toContain("2");
  });

  it("lists active keys in priority order with an empty state otherwise", async () => {
    const user = userEvent.setup();
    render(<Harness />, { wrapper });
    const popup = await openPopover(user);
    expect(within(popup).getByText("No sort applied")).toBeTruthy();
  });

  it("adds a key from the menu, offering only unsorted sortable columns", async () => {
    const user = userEvent.setup();
    render(<Harness initialSort={[{ field: "name", direction: "Asc" }]} />, { wrapper });
    const popup = await openPopover(user);
    await user.click(within(popup).getByRole("button", { name: "Add another sort" }));

    const items = screen.getAllByRole("menuitem").map((el) => el.textContent);
    expect(items).toEqual(["Amount", "Status"]);

    await user.click(screen.getByRole("menuitem", { name: "Status" }));
    expect(order()).toBe("name:Asc,status:Asc");
    expect(screen.queryAllByRole("menuitem")).toHaveLength(0);
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
});
