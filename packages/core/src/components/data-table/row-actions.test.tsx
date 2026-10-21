import { afterEach, describe, it, expect, expectTypeOf, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { resetLocalTimeZone } from "@internationalized/date";
import { testColumns, testData, wrapper, type TestRow } from "./test-utils";
import { DataTable } from "./data-table";
import { useDataTable } from "./use-data-table";
import type { RowAction, UseDataTableOptions } from "./types";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  resetLocalTimeZone();
  vi.restoreAllMocks();
});

// Opens the kebab menu of the row at `index` and returns its "Activate" item.
async function activateItemFor(index: number) {
  const user = userEvent.setup();
  await user.click(screen.getAllByRole("button", { name: "Row actions" })[index]);
  return screen.findByRole("menuitem", { name: "Activate" });
}

describe("DataTable", () => {
  describe("row actions", () => {
    function TestRowActions({ rowActions }: { rowActions: RowAction<TestRow>[] }) {
      const table = useDataTable<TestRow>({ columns: testColumns, data: testData, rowActions });
      return (
        <DataTable.Root value={table}>
          <DataTable.Table />
        </DataTable.Root>
      );
    }

    it("disables an action for rows where canApply returns false", async () => {
      const onClick = vi.fn();
      render(
        <TestRowActions
          rowActions={[
            { id: "activate", label: "Activate", canApply: (r) => r.status !== "Active", onClick },
          ]}
        />,
        { wrapper },
      );

      // Alice is Active → disabled; Bob is Inactive → enabled.
      expect((await activateItemFor(0)).getAttribute("aria-disabled")).toBe("true");
      cleanup();
      render(
        <TestRowActions
          rowActions={[
            { id: "activate", label: "Activate", canApply: (r) => r.status !== "Active", onClick },
          ]}
        />,
        { wrapper },
      );
      const bobItem = await activateItemFor(1);
      expect(bobItem.getAttribute("aria-disabled")).not.toBe("true");
      fireEvent.click(bobItem);
      expect(onClick).toHaveBeenCalledWith(testData.rows[1]);
    });

    it("still honours the deprecated isDisabled", async () => {
      render(
        <TestRowActions
          rowActions={[
            {
              id: "activate",
              label: "Activate",
              isDisabled: (r) => r.status === "Active",
              onClick: vi.fn(),
            },
          ]}
        />,
        { wrapper },
      );

      expect((await activateItemFor(0)).getAttribute("aria-disabled")).toBe("true");
    });

    it("shares presentation with rowSelection.actions while keeping the row predicate separate", () => {
      const activate = { id: "activate", label: "Activate" };
      const options: UseDataTableOptions<TestRow> = {
        columns: testColumns,
        data: testData,
        rowActions: [
          { ...activate, canApply: (row) => row.status !== "Active", onClick: (row) => void row },
        ],
        rowSelection: { actions: [{ ...activate, onClick: (ids) => void ids }] },
      };
      expectTypeOf(options.rowActions![0].canApply).toEqualTypeOf<
        ((row: TestRow) => boolean) | undefined
      >();
      expectTypeOf(options.rowSelection!.actions![0].onClick)
        .parameter(0)
        .toEqualTypeOf<string[]>();
      expect(options.rowSelection!.actions).toHaveLength(1);
    });
  });
});
