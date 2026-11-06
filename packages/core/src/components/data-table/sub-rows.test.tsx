import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { DataTable } from "./data-table";
import { useDataTable } from "./use-data-table";
import { SELECTION_KEY } from "./column-layout";
import type { Column, SubRowsOptions, UseDataTableOptions } from "./types";

type Account = {
  id: string;
  name: string;
  code: string;
  children?: Account[];
  parentId?: string;
};

const ACCOUNTS: Account[] = [
  {
    id: "assets",
    name: "Assets",
    code: "1000",
    children: [
      { id: "cash", name: "Cash", code: "1110" },
      { id: "receivables", name: "Receivables", code: "1120" },
    ],
  },
  { id: "equity", name: "Equity", code: "3000" },
];

const columns: Column<Account>[] = [
  { id: "name", label: "Account", render: (row) => row.name },
  { id: "code", label: "Code", render: (row) => row.code },
];

const wrapper = createAppShellWrapper("en");

afterEach(() => {
  cleanup();
  localStorage.clear();
});

type Options = Partial<Omit<UseDataTableOptions<Account>, "columns" | "data">>;

function Harness({
  options,
  tableColumns = columns,
  rows = ACCOUNTS,
  toolbar,
}: {
  options?: Options;
  rows?: Account[];
  tableColumns?: Column<Account>[];
  toolbar?: ReactNode;
}) {
  const table = useDataTable<Account>({
    columns: tableColumns,
    data: { rows },
    subRows: { getSubRows: (row) => row.children },
    ...options,
  });
  return (
    <DataTable.Root value={table}>
      {toolbar}
      <DataTable.Table />
    </DataTable.Root>
  );
}

const rowFor = (text: string) => screen.getByText(text).closest("tr") as HTMLElement;
const caretFor = (text: string) =>
  within(rowFor(text)).getByRole("button", { name: /expand row|collapse row/i });
const headerKeys = () =>
  Array.from(document.querySelectorAll("thead th")).map((th) => th.getAttribute("data-col-key"));

describe("DataTable subRows", () => {
  it("shows the page's rows, and their sub-rows once opened, indented a step", async () => {
    const user = userEvent.setup();
    render(<Harness />, { wrapper });

    expect(screen.queryByText("Cash")).toBeNull();
    expect(caretFor("Assets").getAttribute("aria-expanded")).toBe("false");
    await user.click(caretFor("Assets"));
    expect(caretFor("Assets").getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Cash")).toBeDefined();

    const indent = (text: string) =>
      rowFor(text).querySelectorAll("[data-slot=data-table-sub-rows-cell] > span[aria-hidden]")
        .length;
    // A child has one indent step plus its caret's space; a top-level leaf only the caret's.
    expect(indent("Cash")).toBe(2);
    expect(indent("Equity")).toBe(1);
  });

  it("names the caret from the hierarchy column's value", () => {
    render(
      <Harness
        tableColumns={[
          { id: "name", label: "Account", accessor: (row) => row.name },
          { id: "code", label: "Code", render: (row) => row.code },
        ]}
      />,
      { wrapper },
    );
    expect(screen.getByRole("button", { name: "Expand row Assets" })).toBeDefined();
  });

  it("follows controlled expandedIds", async () => {
    const user = userEvent.setup();
    const onExpandedChange = vi.fn();
    const { rerender } = render(
      <Harness
        options={{
          subRows: { getSubRows: (row) => row.children, expandedIds: [], onExpandedChange },
        }}
      />,
      { wrapper },
    );

    await user.click(caretFor("Assets"));
    expect(onExpandedChange).toHaveBeenLastCalledWith(["assets"]);
    expect(screen.queryByText("Cash")).toBeNull();

    rerender(
      <Harness
        options={{
          subRows: {
            getSubRows: (row) => row.children,
            expandedIds: ["assets"],
            onExpandedChange,
          },
        }}
      />,
    );
    expect(screen.getByText("Cash")).toBeDefined();
  });

  it("doesn't fire onClickRow from the caret", async () => {
    const user = userEvent.setup();
    const onClickRow = vi.fn();
    render(<Harness options={{ onClickRow }} />, { wrapper });

    await user.click(caretFor("Assets"));
    expect(onClickRow).not.toHaveBeenCalled();
  });

  it("ignores rowExpansion alongside subRows, with a warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<Harness options={{ rowExpansion: { render: () => "details" } }} />, { wrapper });

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("can't be combined"));
    expect(caretFor("Assets")).toBeDefined();
    expect(document.querySelector("[data-col-key=__datatable_expand__]")).toBeNull();
    warn.mockRestore();
  });

  it("warns once, however often an inline subRows re-renders", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { rerender } = render(<Harness options={{ rowExpansion: { render: () => "x" } }} />, {
      wrapper,
    });
    rerender(<Harness options={{ rowExpansion: { render: () => "x" } }} />);
    rerender(<Harness options={{ rowExpansion: { render: () => "x" } }} />);

    expect(
      warn.mock.calls.filter(([msg]) => String(msg).includes("can't be combined")),
    ).toHaveLength(1);
    warn.mockRestore();
  });

  it("leaves a row listed beneath itself out of its own sub-rows, with a warning", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const user = userEvent.setup();
    // Looked up by parent id, where the root names itself as its parent.
    const flat: Account[] = [
      { id: "root", parentId: "root", name: "Root", code: "0" },
      { id: "cash", parentId: "root", name: "Cash", code: "1110" },
    ];
    render(
      <Harness
        rows={[flat[0]]}
        options={{
          subRows: { getSubRows: (row) => flat.filter((r) => r.parentId === row.id) },
        }}
      />,
      { wrapper },
    );

    await user.click(caretFor("Root"));
    expect(screen.getAllByText("Root")).toHaveLength(1);
    expect(screen.getByText("Cash")).toBeDefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('beneath themselves: "root"'));
    warn.mockRestore();
  });

  describe("the hierarchy column", () => {
    const hook = (subRows: Pick<SubRowsOptions<Account>, "column" | "lockColumn"> = {}) =>
      renderHook(
        () =>
          useDataTable<Account>({
            columns,
            data: { rows: ACCOUNTS },
            subRows: { getSubRows: (row) => row.children, ...subRows },
          }),
        { wrapper },
      );

    it("is the first defined column by default, and isn't pinned", () => {
      const { result } = hook();
      expect(result.current.treeColumnKey).toBe("name");
      expect(result.current.pinnedColumns.name).toBeUndefined();
    });

    it("stays where `column` is defined, carrying the indent and caret there", () => {
      render(
        <Harness options={{ subRows: { getSubRows: (row) => row.children, column: "code" } }} />,
        { wrapper },
      );
      expect(headerKeys()).toEqual(["name", "code"]);
      const treeCell = rowFor("1000").querySelector("[data-slot=data-table-sub-rows-cell]");
      expect(treeCell?.textContent).toContain("1000");
    });

    it("falls back to the first column for an unknown `column`, with a warning", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { result } = hook({ column: "nope" });
      expect(result.current.treeColumnKey).toBe("name");
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('"nope"'));
      warn.mockRestore();
    });

    it("can be moved and pinned, but never hidden", () => {
      const { result } = hook();

      act(() => {
        result.current.toggleColumn("name");
        result.current.moveColumn("name", 1);
        result.current.setPin("name", "right");
      });
      expect(result.current.isColumnVisible("name")).toBe(true);
      expect(result.current.columnOrder).toEqual(["code", "name"]);
      expect(result.current.pinnedColumns.name).toBe("right");

      act(() => result.current.hideAllColumns());
      expect(result.current.isColumnVisible("name")).toBe(true);
      expect(result.current.isColumnVisible("code")).toBe(false);
    });

    it("is draggable in column settings, but its visibility can't change", async () => {
      const user = userEvent.setup();
      render(<Harness toolbar={<DataTable.ColumnSettings />} />, { wrapper });

      await user.click(screen.getByRole("button", { name: /columns/i }));
      const popup = await screen.findByRole("group", { name: /column settings/i });
      expect(popup.querySelector("[data-locked]")).toBeNull();
      const checkbox = within(popup).getByRole("checkbox", { name: "Account" });
      expect(checkbox.hasAttribute("data-disabled")).toBe(true);
      expect(checkbox.closest("[draggable]")?.getAttribute("draggable")).toBe("true");
    });

    describe("with lockColumn", () => {
      it("is pinned left, and forced first when `column` names a later one", () => {
        render(
          <Harness
            options={{
              subRows: { getSubRows: (row) => row.children, column: "code", lockColumn: true },
            }}
          />,
          { wrapper },
        );
        expect(headerKeys()).toEqual(["code", "name"]);
        expect(rowFor("1000").querySelector("[data-slot=data-table-sub-rows-cell]")).not.toBeNull();
        expect(hook({ lockColumn: true }).result.current.pinnedColumns.name).toBe("left");
      });

      it("can't be hidden, unpinned or moved, and nothing moves in front of it", () => {
        const { result } = hook({ lockColumn: true });

        act(() => {
          result.current.toggleColumn("name");
          result.current.setPin("name", "none");
          result.current.moveColumn("name", 1);
          result.current.moveColumn("code", 0);
          result.current.hideAllColumns();
        });
        expect(result.current.isColumnVisible("name")).toBe(true);
        expect(result.current.pinnedColumns.name).toBe("left");
        expect(result.current.columnOrder).toEqual(["name", "code"]);
        expect(result.current.isColumnVisible("code")).toBe(false);

        act(() => result.current.setColumnOrder(["code", "name"]));
        expect(result.current.columnOrder).toEqual(["name", "code"]);
      });

      it("shows as locked in column settings: no drag handle, visibility can't change", async () => {
        const user = userEvent.setup();
        render(
          <Harness
            options={{ subRows: { getSubRows: (row) => row.children, lockColumn: true } }}
            toolbar={<DataTable.ColumnSettings />}
          />,
          { wrapper },
        );

        await user.click(screen.getByRole("button", { name: /columns/i }));
        const popup = await screen.findByRole("group", { name: /column settings/i });
        const locked = popup.querySelector("[data-locked]") as HTMLElement;
        expect(locked.textContent).toContain("Account");
        expect(locked.getAttribute("draggable")).toBe("false");
        const checkbox = within(locked).getByRole("checkbox", { name: "Account" });
        expect(checkbox.hasAttribute("data-disabled")).toBe(true);
      });
    });
  });

  describe("selection", () => {
    function Selecting({
      selection,
      column,
    }: {
      selection?: Partial<NonNullable<UseDataTableOptions<Account>["rowSelection"]>>;
      column?: string;
    }) {
      const [ids, setIds] = useState<string[]>(["elsewhere"]);
      const table = useDataTable<Account>({
        columns,
        data: { rows: ACCOUNTS },
        subRows: {
          getSubRows: (row) => row.children,
          defaultExpandedIds: ["assets"],
          column,
        },
        rowSelection: { ...selection, selectedIds: ids, onChange: setIds } as NonNullable<
          UseDataTableOptions<Account>["rowSelection"]
        >,
      });
      return (
        <DataTable.Root value={table}>
          <output data-testid="ids">{JSON.stringify(ids)}</output>
          <DataTable.Table />
        </DataTable.Root>
      );
    }
    const ids = () => JSON.parse(screen.getByTestId("ids").textContent ?? "[]") as string[];
    const checkboxFor = (text: string) =>
      within(rowFor(text)).getByRole("checkbox", { name: "Select row" });

    it('defaults to "full" / "leaves": the checkboxes sit in the tree column, a parent ticks its leaves', async () => {
      const user = userEvent.setup();
      render(<Selecting />, { wrapper });

      expect(headerKeys()).not.toContain(SELECTION_KEY);
      await user.click(checkboxFor("Assets"));
      // Ids from other pages pass through untouched.
      expect(ids()).toEqual(["cash", "receivables", "elsewhere"]);

      await user.click(checkboxFor("Cash"));
      expect(ids()).toEqual(["receivables", "elsewhere"]);
      expect(checkboxFor("Assets").getAttribute("aria-checked")).toBe("mixed");
    });

    it('lists a fully ticked parent with valueStrategy "topmost"', async () => {
      const user = userEvent.setup();
      render(<Selecting selection={{ valueStrategy: "topmost" }} />, { wrapper });

      await user.click(checkboxFor("Assets"));
      expect(ids()).toEqual(["assets", "elsewhere"]);
    });

    it('keeps the selection column, and ticks rows on their own, with selectionPropagation "none"', async () => {
      const user = userEvent.setup();
      render(<Selecting selection={{ selectionPropagation: "none" }} />, { wrapper });

      expect(headerKeys()[0]).toBe(SELECTION_KEY);
      await user.click(checkboxFor("Assets"));
      expect(ids()).toEqual(["assets", "elsewhere"]);
      expect(
        rowFor("Assets").querySelector("[data-slot=data-table-sub-rows-cell] [role=checkbox]"),
      ).toBeNull();
    });

    it("keeps the checkboxes flat in the selection column when the tree column isn't first, still propagating", async () => {
      const user = userEvent.setup();
      render(<Selecting column="code" />, { wrapper });

      expect(headerKeys()).toEqual([SELECTION_KEY, "name", "code"]);
      expect(
        rowFor("Assets").querySelector("[data-slot=data-table-sub-rows-cell] [role=checkbox]"),
      ).toBeNull();
      await user.click(checkboxFor("Cash"));
      expect(ids()).toEqual(["cash", "elsewhere"]);
      expect(checkboxFor("Assets").hasAttribute("data-indeterminate")).toBe(true);
    });

    it("selects the page's leaves from the tree column's header, keeping other pages' ids", () => {
      render(<Selecting />, { wrapper });

      const selectAll = screen.getByRole("checkbox", { name: "Select all rows" });
      expect(selectAll.closest("th")?.getAttribute("data-col-key")).toBe("name");
      fireEvent.click(selectAll);
      expect(ids()).toEqual(["cash", "receivables", "equity", "elsewhere"]);

      fireEvent.click(selectAll);
      expect(ids()).toEqual(["elsewhere"]);
    });
  });
});
