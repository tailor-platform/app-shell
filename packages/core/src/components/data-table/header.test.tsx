import { afterEach, describe, it, expect, expectTypeOf, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { resetLocalTimeZone } from "@internationalized/date";
import type { CollectionControl, SortState } from "@/types/collection";
import { useCollectionVariables } from "@/hooks/use-collection-variables";
import {
  TestDataTable,
  testData,
  makeControl,
  wrapper,
  headByText,
  openHeaderContextMenu,
  type TestRow,
} from "./test-utils";
import { DataTable } from "./data-table";
import { useDataTable } from "./use-data-table";
import type { Column, HeaderRenderContext } from "./types";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  resetLocalTimeZone();
  vi.restoreAllMocks();
});

function SortableHeaderHarness({ control }: { control: CollectionControl }) {
  const table = useDataTable<TestRow>({
    columns: [
      {
        label: "Name",
        sort: { field: "name", type: "string" },
        header: (ctx) =>
          ctx.sortable ? (
            <button type="button" onClick={ctx.activateSort}>
              {ctx.label} {ctx.sortDirection}
            </button>
          ) : null,
        render: (row) => row.name,
      },
    ],
    data: testData,
    control,
  });

  return (
    <DataTable.Root value={table}>
      <DataTable.Table />
    </DataTable.Root>
  );
}

describe("DataTable", () => {
  describe("sort accessibility", () => {
    it("updates aria-sort through the unsorted, ascending, descending, and reset cycle", () => {
      function Harness() {
        const { control } = useCollectionVariables({ params: { pageSize: 10 } });
        const table = useDataTable<TestRow>({
          columns: [
            {
              id: "displayName",
              label: "Name",
              sort: { field: "name", type: "string" },
              render: (row) => row.name,
            },
            { label: "Status", render: (row) => row.status },
          ],
          data: testData,
          control,
        });
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }

      render(<Harness />, { wrapper });

      const header = screen.getByRole("columnheader", { name: "Name" });
      const button = screen.getByRole("button", { name: "Name" });
      expect(header.hasAttribute("aria-sort")).toBe(false);
      expect(button.textContent).toBe("Name");
      expect(screen.getByRole("columnheader", { name: "Status" }).hasAttribute("aria-sort")).toBe(
        false,
      );

      for (const direction of ["ascending", "descending", null]) {
        fireEvent.click(button);
        expect(header.getAttribute("aria-sort")).toBe(direction);
      }
    });

    it("only annotates the primary sort and transfers it when that key is removed", () => {
      function Harness() {
        const { control } = useCollectionVariables({ params: { pageSize: 10 } });
        const table = useDataTable<TestRow>({
          columns: [
            {
              label: "Name",
              sort: { field: "name", type: "string" },
              render: (row) => row.name,
            },
            {
              label: "Status",
              sort: { field: "status", type: "string" },
              render: (row) => row.status,
            },
          ],
          data: testData,
          control,
          sort: { multiple: true },
        });
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }

      const { container } = render(<Harness />, { wrapper });
      const name = screen.getByRole("columnheader", { name: "Name" });
      const status = screen.getByRole("columnheader", { name: "Status" });
      const nameButton = screen.getByRole("button", { name: "Name" });
      const statusButton = screen.getByRole("button", { name: "Status" });
      expect(container.querySelectorAll("[aria-sort]")).toHaveLength(0);

      fireEvent.click(statusButton);
      fireEvent.click(nameButton);
      fireEvent.click(nameButton);
      expect(status.getAttribute("aria-sort")).toBe("ascending");
      expect(name.hasAttribute("aria-sort")).toBe(false);
      expect(container.querySelectorAll("[aria-sort]")).toHaveLength(1);
      expect(statusButton.textContent).toBe("Status▲");
      expect(nameButton.textContent).toBe("Name▼");

      fireEvent.click(statusButton);
      fireEvent.click(statusButton);
      expect(name.getAttribute("aria-sort")).toBe("descending");
      expect(status.hasAttribute("aria-sort")).toBe(false);
      expect(statusButton.textContent).toBe("Status");
      expect(container.querySelectorAll("[aria-sort]")).toHaveLength(1);
    });

    it("does not present a secondary sort as primary when the primary column is hidden", () => {
      function Harness() {
        const table = useDataTable<TestRow>({
          columns: [
            {
              label: "Name",
              sort: { field: "name", type: "string" },
              render: (row) => row.name,
            },
          ],
          data: testData,
          control: makeControl({
            sortStates: [
              { field: "status", direction: "Asc" },
              { field: "name", direction: "Desc" },
            ],
          }),
          sort: { multiple: true },
        });
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }

      render(<Harness />, { wrapper });
      expect(screen.getByRole("columnheader").hasAttribute("aria-sort")).toBe(false);
    });

    it.each(["no control", "sort disabled"])("omits aria-sort with %s", (mode) => {
      function Harness() {
        const table = useDataTable<TestRow>({
          columns: [
            {
              label: "Name",
              sort: { field: "name", type: "string" },
              render: (row) => row.name,
            },
          ],
          data: testData,
          control:
            mode === "no control"
              ? undefined
              : makeControl({ sortStates: [{ field: "name", direction: "Asc" }] }),
          sort: mode === "sort disabled" ? false : undefined,
        });
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }

      render(<Harness />, { wrapper });

      expect(screen.getByRole("columnheader").hasAttribute("aria-sort")).toBe(false);
    });
  });

  describe("custom headers", () => {
    it("renders custom header content", () => {
      const columns: Column<TestRow>[] = [
        {
          label: "Name",
          header: () => (
            <>
              <span>Customer</span>
              <span aria-hidden>*</span>
            </>
          ),
          render: (row) => row.name,
        },
      ];

      render(<TestDataTable columns={columns} />, { wrapper });

      expect(screen.getByText("Customer")).toBeDefined();
      expect(screen.getByText("*")).toBeDefined();
      expect(screen.queryByText("Name")).toBeNull();
    });

    it("keeps built-in sort behavior, hit area, and context menu with headerProps", () => {
      const control = makeControl();

      function Harness() {
        const table = useDataTable<TestRow>({
          columns: [
            {
              label: "Name",
              sort: { field: "name", type: "string" },
              headerProps: () => ({
                className: "astw:tabular-nums",
                style: { backgroundColor: "red" },
                title: "Employee name",
              }),
              render: (row) => row.name,
            },
          ],
          data: testData,
          control,
        });

        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }

      const { container } = render(<Harness />, { wrapper });

      expect(headByText(container, "Name")?.title).toBe("Employee name");
      const button = screen.getByRole("button", { name: "Name" });
      expect(button.className).toContain("astw:h-10");
      expect(button.className).toContain("astw:-mx-2");
      expect(button.className).toContain("astw:px-2");

      fireEvent.click(button);

      expect(control.clearSort).toHaveBeenCalledTimes(1);
      expect(control.setSort).toHaveBeenCalledTimes(1);
      expect(control.setSort).toHaveBeenCalledWith("name", "Asc");

      openHeaderContextMenu(container, "Name");
      expect(screen.getByRole("menuitem", { name: "Copy label" })).toBeDefined();
    });

    it("recomputes headerProps from sort context and restores defaults for undefined", () => {
      const columns: Column<TestRow>[] = [
        {
          label: "Name",
          sort: { field: "name", type: "string" },
          render: (row) => row.name,
          headerProps: (ctx) => {
            if (!ctx.sortable) return undefined;
            expectTypeOf(ctx.sortDirection).toEqualTypeOf<"Asc" | "Desc" | undefined>();
            expectTypeOf(ctx.activateSort).toEqualTypeOf<() => void>();
            return ctx.sortDirection
              ? {
                  className: "astw:tabular-nums",
                  style: { backgroundColor: ctx.sortDirection === "Asc" ? "red" : "blue" },
                  title: `${ctx.label} ${ctx.sortDirection}`,
                }
              : undefined;
          },
        },
      ];
      function Harness({ control }: { control?: CollectionControl }) {
        const table = useDataTable({ columns, data: testData, control });
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }

      const { rerender } = render(
        <Harness control={makeControl({ sortStates: [{ field: "name", direction: "Asc" }] })} />,
        { wrapper },
      );
      expect(screen.getByRole("columnheader").title).toBe("Name Asc");
      expect(screen.getByRole("columnheader").style.backgroundColor).toBe("red");
      rerender(
        <Harness control={makeControl({ sortStates: [{ field: "name", direction: "Desc" }] })} />,
      );
      expect(screen.getByRole("columnheader").title).toBe("Name Desc");
      expect(screen.getByRole("columnheader").style.backgroundColor).toBe("blue");

      for (const control of [makeControl(), undefined]) {
        rerender(<Harness control={control} />);
        const header = screen.getByRole("columnheader");
        expect(header.style.backgroundColor).toBe("");
        expect(header.title).toBe("");
        expect(header.className).not.toContain("astw:tabular-nums");
      }
    });

    it("passes non-sortable context when sort config exists but sorting is inactive", () => {
      let seenSortable: boolean | undefined;
      const columns: Column<TestRow>[] = [
        {
          label: "Name",
          sort: { field: "name", type: "string" },
          header: (ctx) => {
            seenSortable = ctx.sortable;
            return ctx.sortable ? "sortable" : "static";
          },
          render: (row) => row.name,
        },
      ];

      render(<TestDataTable columns={columns} />, { wrapper });

      expect(screen.getByText("static")).toBeDefined();
      expect(seenSortable).toBe(false);
    });

    it("passes sortable context and activateSort reuses the shared sort behavior", () => {
      const control = makeControl({
        sortStates: [{ field: "name", direction: "Asc" }],
      });

      const { rerender } = render(<SortableHeaderHarness control={control} />, { wrapper });

      expect(screen.getByRole("columnheader").getAttribute("aria-sort")).toBe("ascending");
      fireEvent.click(screen.getByRole("button", { name: "Name Asc" }));

      expect(control.clearSort).toHaveBeenCalledTimes(1);
      expect(control.setSort).toHaveBeenCalledTimes(1);
      expect(control.setSort).toHaveBeenCalledWith("name", "Desc");

      rerender(
        <SortableHeaderHarness
          control={makeControl({ sortStates: [{ field: "name", direction: "Desc" }] })}
        />,
      );
      expect(screen.getByRole("columnheader").getAttribute("aria-sort")).toBe("descending");

      rerender(<SortableHeaderHarness control={makeControl()} />);
      expect(screen.getByRole("columnheader").hasAttribute("aria-sort")).toBe(false);
    });

    it("updates sortIndex and sortCount for both header callbacks in sort-priority order", () => {
      const header = vi.fn((ctx: HeaderRenderContext) => ctx.label);
      const headerProps = vi.fn(() => undefined);
      const columns: Column<TestRow>[] = [
        {
          label: "Name",
          sort: { field: "name", type: "string" },
          header,
          headerProps,
          render: (row) => row.name,
        },
        {
          label: "Status",
          sort: { field: "status", type: "string" },
          header,
          headerProps,
          render: (row) => row.status,
        },
      ];
      function Harness({ sortStates }: { sortStates: SortState[] }) {
        const table = useDataTable({
          columns,
          data: testData,
          control: makeControl({ sortStates }),
          sort: { multiple: true },
        });
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }

      const { rerender } = render(<Harness sortStates={[]} />, { wrapper });
      const cases: { sortStates: SortState[]; nameIndex?: number; statusIndex?: number }[] = [
        { sortStates: [] },
        { sortStates: [{ field: "status", direction: "Asc" }], statusIndex: 1 },
        {
          sortStates: [
            { field: "status", direction: "Asc" },
            { field: "name", direction: "Desc" },
          ],
          nameIndex: 2,
          statusIndex: 1,
        },
        { sortStates: [{ field: "name", direction: "Desc" }], nameIndex: 1 },
        {
          sortStates: [
            { field: "hidden", direction: "Asc" },
            { field: "name", direction: "Desc" },
          ],
          nameIndex: 2,
        },
      ];
      for (const { sortStates, nameIndex, statusIndex } of cases) {
        header.mockClear();
        headerProps.mockClear();
        rerender(<Harness sortStates={sortStates} />);
        for (const callback of [header, headerProps]) {
          expect(callback).toHaveBeenCalledWith(
            expect.objectContaining({
              label: "Name",
              sortable: true,
              sortIndex: nameIndex,
              sortCount: sortStates.length,
            }),
          );
          expect(callback).toHaveBeenCalledWith(
            expect.objectContaining({
              label: "Status",
              sortable: true,
              sortIndex: statusIndex,
              sortCount: sortStates.length,
            }),
          );
        }
      }
    });

    it("narrows header render context by sortable", () => {
      const column: Column<TestRow> = {
        label: "Name",
        header: (ctx) => {
          if (ctx.sortable) {
            expectTypeOf(ctx).toEqualTypeOf<{
              label?: string;
              sortable: true;
              sortDirection: "Asc" | "Desc" | undefined;
              sortIndex?: number;
              sortCount: number;
              activateSort: () => void;
            }>();
          } else {
            expectTypeOf(ctx).toEqualTypeOf<{
              label?: string;
              sortable: false;
            }>();
          }
          return ctx.label;
        },
        render: (row) => row.name,
      };

      expect(column).toBeDefined();
    });
  });
});
