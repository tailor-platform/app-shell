import { afterEach, describe, it, expect, expectTypeOf, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { resetLocalTimeZone } from "@internationalized/date";
import type { CollectionControl } from "@/types/collection";
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
import type { Column } from "./types";

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

      render(<SortableHeaderHarness control={control} />, { wrapper });

      fireEvent.click(screen.getByRole("button", { name: "Name Asc" }));

      expect(control.clearSort).toHaveBeenCalledTimes(1);
      expect(control.setSort).toHaveBeenCalledTimes(1);
      expect(control.setSort).toHaveBeenCalledWith("name", "Desc");
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
