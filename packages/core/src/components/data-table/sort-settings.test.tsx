import { afterEach, describe, expect, it } from "vitest";
import {
  act,
  cleanup,
  createEvent,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCollectionVariables } from "@/hooks/use-collection-variables";
import type { SortState } from "@/types/collection";
import { DataTable } from "./data-table";
import { useDataTable } from "./use-data-table";
import { testData, wrapper, type TestRow } from "./test-utils";
import type { Column, UseDataTableOptions } from "./types";

afterEach(cleanup);

const columns: Column<TestRow>[] = [
  {
    id: "display-name",
    label: "Name",
    pin: "left",
    sort: { field: "name", type: "string" },
    render: (row) => row.name,
  },
  {
    id: "display-status",
    label: "Status",
    sort: { field: "status", type: "string" },
    render: (row) => row.status,
  },
  {
    id: "display-id",
    label: "Identifier",
    sort: { field: "id", type: "string" },
    render: (row) => row.id,
  },
  { id: "details", label: "Details", render: (row) => row.name },
];

function Harness({
  initialSort = [],
  sort,
  withControl = true,
  tableColumns = columns,
}: {
  initialSort?: SortState[];
  sort?: UseDataTableOptions<TestRow>["sort"];
  withControl?: boolean;
  tableColumns?: Column<TestRow>[];
}) {
  const { variables, control } = useCollectionVariables({ params: { initialSort } });
  const table = useDataTable({
    columns: tableColumns,
    data: testData,
    control: withControl ? control : undefined,
    sort,
  });
  return (
    <DataTable.Root value={table}>
      <DataTable.ColumnSettings />
      <DataTable.Table />
      <output aria-label="Sort order">{JSON.stringify(variables.order ?? [])}</output>
      <output aria-label="Column layout">
        {JSON.stringify({
          order: table.columnOrder,
          pinned: table.pinnedColumns,
          visible: table.visibleColumns.map((column) => column.id),
        })}
      </output>
    </DataTable.Root>
  );
}

function openSettings() {
  fireEvent.click(screen.getByRole("button", { name: "Columns" }));
}

function openSorting() {
  openSettings();
  fireEvent.click(screen.getByRole("tab", { name: "Sorting" }));
}

const sortOrder = () => JSON.parse(screen.getByLabelText("Sort order").textContent ?? "[]");
const sortedColumns = () => screen.getByRole("group", { name: "Sorted columns" });
const candidates = () => screen.getByRole("group", { name: "Available columns" });

function dragRow(row: Element, destination: Element, edge: "before" | "after" = "before") {
  fireEvent.dragStart(row);
  const over = createEvent.dragOver(destination);
  const rect = destination.getBoundingClientRect();
  // happy-dom's DragEvent does not retain clientY; define the row-half geometry explicitly.
  Object.defineProperty(over, "clientY", {
    value: rect.top + rect.height / 2 + (edge === "after" ? 1 : -1),
  });
  fireEvent(destination, over);
  fireEvent.drop(destination);
  fireEvent.dragEnd(row);
}

function dragCandidate(name: string, target?: { name: string; edge: "before" | "after" }) {
  const row = within(candidates())
    .getByRole("button", { name: `Sort by ${name}` })
    .closest('[draggable="true"]')!;
  const destination = target
    ? within(sortedColumns()).getByText(target.name).closest('[draggable="true"]')!
    : sortedColumns();
  dragRow(row, destination, target?.edge);
}

function dragSort(name: string, target?: { name: string; edge: "before" | "after" }) {
  const row = within(sortedColumns()).getByText(name).closest('[draggable="true"]')!;
  const destination = target
    ? within(sortedColumns()).getByText(target.name).closest('[draggable="true"]')!
    : sortedColumns();
  dragRow(row, destination, target?.edge);
}

describe("DataTable.ColumnSettings sorting", () => {
  it.each([
    { name: "without collection control", withControl: false },
    { name: "when sorting is disabled", sort: false as const },
  ])("disables the sorting tab $name but keeps visibility usable", (props) => {
    render(<Harness {...props} />, { wrapper });
    openSettings();

    const sorting = screen.getByRole("tab", { name: "Sorting" });
    expect(sorting.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByRole("tab", { name: "Visibility" }).getAttribute("aria-selected")).toBe(
      "true",
    );
    fireEvent.click(sorting);
    expect(screen.queryByRole("group", { name: "Sorted columns" })).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: "Identifier" }));
    expect(screen.queryByRole("columnheader", { name: "Identifier" })).toBeNull();
    expect(sortOrder()).toEqual([]);
  });

  it("switches between visibility and sorting with the keyboard", async () => {
    const user = userEvent.setup();
    render(<Harness />, { wrapper });
    await user.click(screen.getByRole("button", { name: "Columns" }));
    await user.click(screen.getByRole("tab", { name: "Visibility" }));

    await user.keyboard("{ArrowRight}{Enter}");
    expect(screen.getByRole("tab", { name: "Sorting" }).getAttribute("aria-selected")).toBe("true");
    expect(sortedColumns()).toBeTruthy();
    expect(screen.queryByRole("checkbox", { name: "Name" })).toBeNull();

    await user.keyboard("{ArrowLeft}{Enter}");
    expect(screen.getByRole("tab", { name: "Visibility" }).getAttribute("aria-selected")).toBe(
      "true",
    );
    expect(screen.getByRole("checkbox", { name: "Name" })).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Sorted columns" })).toBeNull();
  });

  it("adds a dragged candidate as ascending using its sort field, not its column id", () => {
    render(<Harness />, { wrapper });
    openSorting();
    dragCandidate("Name");

    expect(sortOrder()).toEqual([{ field: "name", direction: "Asc" }]);
    expect(within(sortedColumns()).getByText("Name")).toBeTruthy();
    expect(within(sortedColumns()).getByRole("button", { name: /Name: Ascending/ })).toBeTruthy();
    expect(within(candidates()).queryByRole("button", { name: "Sort by Name" })).toBeNull();
  });

  it.each([
    {
      name: "before the first key",
      target: { name: "Name", edge: "before" as const },
      position: 0,
    },
    {
      name: "between keys using the lower row half",
      target: { name: "Name", edge: "after" as const },
      position: 1,
    },
    { name: "after the last key", target: { name: "Status", edge: "after" as const }, position: 2 },
    { name: "at the end via the group", target: undefined, position: 2 },
  ])(
    "inserts a dragged candidate $name without changing other directions",
    ({ target, position }) => {
      const initialSort: SortState[] = [
        { field: "name", direction: "Desc" },
        { field: "status", direction: "Asc" },
      ];
      render(<Harness sort={{ multiple: true }} initialSort={initialSort} />, { wrapper });
      openSorting();
      dragCandidate("Identifier", target);

      const expected = [...initialSort];
      expected.splice(position, 0, { field: "id", direction: "Asc" });
      expect(sortOrder()).toEqual(expected);
      expect(within(candidates()).queryByRole("button", { name: "Sort by Identifier" })).toBeNull();
      fireEvent.drop(sortedColumns());
      expect(sortOrder()).toEqual(expected);
    },
  );

  it("replaces rather than inserts when a candidate targets a row in single-sort mode", () => {
    render(<Harness initialSort={[{ field: "name", direction: "Desc" }]} />, { wrapper });
    openSorting();
    dragCandidate("Status", { name: "Name", edge: "before" });

    expect(sortOrder()).toEqual([{ field: "status", direction: "Asc" }]);
    expect(within(sortedColumns()).queryByText("Name")).toBeNull();
    expect(within(candidates()).getByRole("button", { name: "Sort by Name" })).toBeTruthy();
  });

  it("offers Enter activation as an alternative to dragging and keeps focus in the popup", async () => {
    const user = userEvent.setup();
    render(<Harness />, { wrapper });
    await user.click(screen.getByRole("button", { name: "Columns" }));
    await user.click(screen.getByRole("tab", { name: "Sorting" }));
    act(() => within(candidates()).getByRole("button", { name: "Sort by Status" }).focus());

    await user.keyboard("{Enter}");

    expect(sortOrder()).toEqual([{ field: "status", direction: "Asc" }]);
    expect(document.activeElement).toBe(sortedColumns());
  });

  it.each([
    { name: "replaces the key in default single-sort mode", sort: undefined, append: false },
    { name: "appends a key in multi-sort mode", sort: { multiple: true }, append: true },
  ])("$name", ({ sort, append }) => {
    render(<Harness sort={sort} initialSort={[{ field: "name", direction: "Desc" }]} />, {
      wrapper,
    });
    openSorting();
    fireEvent.click(within(candidates()).getByRole("button", { name: "Sort by Status" }));

    const added = { field: "status", direction: "Asc" };
    expect(sortOrder()).toEqual(append ? [{ field: "name", direction: "Desc" }, added] : [added]);
  });

  it("toggles direction without changing priority or discarding unrepresented sort keys", () => {
    const initialSort: SortState[] = [
      { field: "external-key", direction: "Desc" },
      { field: "name", direction: "Asc" },
      { field: "status", direction: "Desc" },
    ];
    render(<Harness sort={{ multiple: true }} initialSort={initialSort} />, { wrapper });
    openSorting();
    expect(within(sortedColumns()).getByText("external-key")).toBeTruthy();

    fireEvent.click(within(sortedColumns()).getByRole("button", { name: /Name: Ascending/ }));
    expect(sortOrder()).toEqual([
      initialSort[0],
      { field: "name", direction: "Desc" },
      initialSort[2],
    ]);
    fireEvent.click(within(sortedColumns()).getByRole("button", { name: /Name: Descending/ }));
    expect(sortOrder()).toEqual(initialSort);
  });

  it("removes only the chosen key and returns it to available candidates", () => {
    render(
      <Harness
        sort={{ multiple: true }}
        initialSort={[
          { field: "status", direction: "Desc" },
          { field: "name", direction: "Asc" },
        ]}
      />,
      { wrapper },
    );
    openSorting();
    fireEvent.click(within(sortedColumns()).getByRole("button", { name: "Remove sort for Name" }));

    expect(sortOrder()).toEqual([{ field: "status", direction: "Desc" }]);
    expect(within(sortedColumns()).queryByText("Name")).toBeNull();
    expect(within(candidates()).getByRole("button", { name: "Sort by Name" })).toBeTruthy();
    expect(within(candidates()).queryByRole("button", { name: "Sort by Status" })).toBeNull();
    expect(document.activeElement).toBe(sortedColumns());
  });

  it.each([
    { name: "Name", field: "name", query: "", represented: true },
    { name: "Name", field: "name", query: "missing", represented: true },
    { name: "external-key", field: "external-key", query: "missing", represented: false },
  ])(
    "drags $name back to available columns with query '$query'",
    ({ name, field, query, represented }) => {
      const initialSort: SortState[] = [
        { field: "external-key", direction: "Desc" },
        { field: "name", direction: "Asc" },
        { field: "status", direction: "Desc" },
      ];
      render(<Harness sort={{ multiple: true }} initialSort={initialSort} />, { wrapper });
      openSorting();
      const search = screen.getByRole("searchbox", { name: "Search columns" });
      fireEvent.change(search, { target: { value: query } });
      if (query) expect(within(candidates()).getByText("No columns match")).toBeTruthy();
      const row = within(sortedColumns()).getByText(name).closest('[draggable="true"]')!;
      dragRow(row, candidates());

      expect(sortOrder()).toEqual(initialSort.filter((sort) => sort.field !== field));
      expect(within(sortedColumns()).queryByText(name)).toBeNull();
      expect(document.activeElement).toBe(candidates());
      expect((search as HTMLInputElement).value).toBe(query);
      fireEvent.change(search, { target: { value: "" } });
      const returned = within(candidates()).queryByRole("button", { name: `Sort by ${name}` });
      if (represented) expect(returned).toBeTruthy();
      else expect(returned).toBeNull();
    },
  );

  it("filters only candidates with trimmed case-insensitive search and supports filtered dragging", () => {
    render(
      <Harness sort={{ multiple: true }} initialSort={[{ field: "name", direction: "Desc" }]} />,
      { wrapper },
    );
    openSorting();
    const search = screen.getByRole("searchbox", { name: "Search columns" });
    fireEvent.change(search, { target: { value: "  sTaT  " } });

    expect(within(candidates()).getByRole("button", { name: "Sort by Status" })).toBeTruthy();
    expect(within(candidates()).queryByRole("button", { name: "Sort by Identifier" })).toBeNull();
    expect(within(sortedColumns()).getByText("Name")).toBeTruthy();

    fireEvent.change(search, { target: { value: "missing" } });
    expect(within(candidates()).getByText("No columns match")).toBeTruthy();
    expect(within(sortedColumns()).getByText("Name")).toBeTruthy();

    fireEvent.change(search, { target: { value: "" } });
    expect(within(candidates()).getAllByRole("button")).toHaveLength(2);
    fireEvent.change(search, { target: { value: "status" } });
    dragCandidate("Status");
    expect(sortOrder()).toEqual([
      { field: "name", direction: "Desc" },
      { field: "status", direction: "Asc" },
    ]);
    expect(within(sortedColumns()).getByText("Name")).toBeTruthy();
    expect(within(sortedColumns()).getByText("Status")).toBeTruthy();
  });

  it("excludes non-sortable columns and deduplicates columns with the same sort field", () => {
    render(
      <Harness
        tableColumns={[
          ...columns,
          {
            id: "alternate-name",
            label: "Alternate name",
            sort: { field: "name", type: "string" },
            render: (row) => row.name,
          },
        ]}
      />,
      { wrapper },
    );
    openSorting();

    expect(within(candidates()).getAllByRole("button")).toHaveLength(3);
    expect(within(candidates()).queryByText("Details")).toBeNull();
    expect(within(candidates()).queryByText("Alternate name")).toBeNull();
    fireEvent.click(within(candidates()).getByRole("button", { name: "Sort by Name" }));
    expect(sortOrder()).toEqual([{ field: "name", direction: "Asc" }]);
  });

  it("keeps visibility and pinning unchanged and allows sorting a hidden column", () => {
    render(<Harness sort={{ multiple: true }} />, { wrapper });
    openSettings();
    fireEvent.click(screen.getByRole("checkbox", { name: "Identifier" }));
    const layout = screen.getByLabelText("Column layout").textContent;
    fireEvent.click(screen.getByRole("tab", { name: "Sorting" }));
    fireEvent.click(within(candidates()).getByRole("button", { name: "Sort by Identifier" }));
    fireEvent.click(within(sortedColumns()).getByRole("button", { name: /Identifier: Ascending/ }));
    expect(sortOrder()).toEqual([{ field: "id", direction: "Desc" }]);
    expect(screen.getByLabelText("Column layout").textContent).toBe(layout);
    fireEvent.click(
      within(sortedColumns()).getByRole("button", { name: "Remove sort for Identifier" }),
    );
    expect(screen.getByLabelText("Column layout").textContent).toBe(layout);

    fireEvent.click(screen.getByRole("tab", { name: "Visibility" }));
    expect(screen.getByRole("checkbox", { name: "Identifier" }).getAttribute("aria-checked")).toBe(
      "false",
    );
    expect(screen.queryByRole("columnheader", { name: "Identifier" })).toBeNull();
    expect(screen.getByRole("columnheader", { name: "Name" }).style.position).toBe("sticky");
  });

  it("moves the first active key to the end without changing directions", () => {
    const initialSort: SortState[] = [
      { field: "name", direction: "Desc" },
      { field: "status", direction: "Asc" },
      { field: "id", direction: "Desc" },
    ];
    render(<Harness sort={{ multiple: true }} initialSort={initialSort} />, { wrapper });
    openSorting();
    dragSort("Name");

    expect(sortOrder()).toEqual([initialSort[1], initialSort[2], initialSort[0]]);
    expect(screen.getByRole("columnheader", { name: "Status" }).getAttribute("aria-sort")).toBe(
      "ascending",
    );
    expect(screen.getByRole("columnheader", { name: "Name" }).hasAttribute("aria-sort")).toBe(
      false,
    );
  });

  it("moves the last key before the first while preserving unrepresented keys and search", () => {
    const initialSort: SortState[] = [
      { field: "external-key", direction: "Desc" },
      { field: "name", direction: "Asc" },
      { field: "status", direction: "Desc" },
    ];
    render(<Harness sort={{ multiple: true }} initialSort={initialSort} />, { wrapper });
    openSorting();
    const search = screen.getByRole("searchbox", { name: "Search columns" });
    fireEvent.change(search, { target: { value: "identifier" } });
    dragSort("Status", { name: "external-key", edge: "before" });

    expect(sortOrder()).toEqual([initialSort[2], initialSort[0], initialSort[1]]);
    expect(within(sortedColumns()).getByText("external-key")).toBeTruthy();
    expect((search as HTMLInputElement).value).toBe("identifier");
    expect(within(candidates()).getByRole("button", { name: "Sort by Identifier" })).toBeTruthy();
  });

  it("inserts after the target row's midpoint with the same-list index correction", () => {
    const initialSort: SortState[] = [
      { field: "name", direction: "Asc" },
      { field: "status", direction: "Desc" },
      { field: "id", direction: "Asc" },
    ];
    render(<Harness sort={{ multiple: true }} initialSort={initialSort} />, { wrapper });
    openSorting();
    dragSort("Name", { name: "Status", edge: "after" });

    expect(sortOrder()).toEqual([initialSort[1], initialSort[0], initialSort[2]]);
  });

  it("keeps the order unchanged for self-drops and dropping the last key at the end", () => {
    const initialSort: SortState[] = [
      { field: "name", direction: "Asc" },
      { field: "status", direction: "Desc" },
    ];
    render(<Harness sort={{ multiple: true }} initialSort={initialSort} />, { wrapper });
    openSorting();
    dragSort("Name", { name: "Name", edge: "before" });
    expect(sortOrder()).toEqual(initialSort);
    dragSort("Name", { name: "Name", edge: "after" });
    expect(sortOrder()).toEqual(initialSort);
    dragSort("Status");
    expect(sortOrder()).toEqual(initialSort);
  });

  it("reorders using the grip's arrow keys, preserves focus, and ignores boundaries", async () => {
    const user = userEvent.setup();
    const initialSort: SortState[] = [
      { field: "name", direction: "Desc" },
      { field: "status", direction: "Asc" },
    ];
    render(<Harness sort={{ multiple: true }} initialSort={initialSort} />, { wrapper });
    await user.click(screen.getByRole("button", { name: "Columns" }));
    await user.click(screen.getByRole("tab", { name: "Sorting" }));
    const grip = within(sortedColumns()).getByRole("button", { name: /^Reorder sort for Name / });
    act(() => grip.focus());

    await user.keyboard("{ArrowUp}");
    expect(sortOrder()).toEqual(initialSort);
    await user.keyboard("{ArrowDown}");
    expect(sortOrder()).toEqual([initialSort[1], initialSort[0]]);
    expect(document.activeElement).toBe(grip);
    expect(grip.getAttribute("aria-label")).toContain("(2 of 2)");
    await user.keyboard("{ArrowDown}");
    expect(sortOrder()).toEqual([initialSort[1], initialSort[0]]);
    expect(document.activeElement).toBe(grip);
    await user.keyboard("{ArrowUp}");
    expect(sortOrder()).toEqual(initialSort);
    expect(document.activeElement).toBe(grip);
  });

  it("returns to visibility if sorting becomes disabled while the sorting panel is open", () => {
    const { rerender } = render(<Harness sort={{ multiple: true }} />, { wrapper });
    openSorting();
    expect(sortedColumns()).toBeTruthy();
    rerender(<Harness sort={false} />);

    expect(screen.getByRole("tab", { name: "Visibility" }).getAttribute("aria-selected")).toBe(
      "true",
    );
    expect(screen.getByRole("tab", { name: "Sorting" }).getAttribute("aria-disabled")).toBe("true");
    expect(screen.queryByRole("group", { name: "Sorted columns" })).toBeNull();
    expect(screen.getByRole("checkbox", { name: "Name" })).toBeTruthy();
  });

  it("ignores drops without an in-panel drag source in either section", () => {
    const initialSort: SortState[] = [{ field: "name", direction: "Desc" }];
    render(<Harness sort={{ multiple: true }} initialSort={initialSort} />, { wrapper });
    openSorting();
    const dataTransfer = { getData: () => "name" };
    fireEvent.dragOver(sortedColumns(), { dataTransfer });
    fireEvent.drop(sortedColumns(), { dataTransfer });
    fireEvent.dragOver(candidates(), { dataTransfer });
    fireEvent.drop(candidates(), { dataTransfer });
    expect(sortOrder()).toEqual(initialSort);
  });
});
