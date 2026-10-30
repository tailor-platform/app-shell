import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { resetLocalTimeZone } from "@internationalized/date";
import {
  TestDataTable,
  testData,
  makeControl,
  wrapper,
  createTimeZoneWrapper,
  stubBrowserTimeZone,
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

const cellByText = (container: HTMLElement, text: string) =>
  Array.from(container.querySelectorAll<HTMLElement>('[data-slot="data-table-cell"]')).find(
    (cell) => cell.textContent?.trim() === text,
  );

const openCellContextMenu = (container: HTMLElement, text: string) => {
  fireEvent.contextMenu(cellByText(container, text)!);
};

const hoverMenuItem = (name: string) => {
  const item = screen.getByRole("menuitem", { name });
  fireEvent.mouseEnter(item);
  fireEvent.mouseMove(item);
  fireEvent.pointerMove(item);
};

describe("DataTable", () => {
  describe("header context menu", () => {
    it("shows copy, pin, and sort actions on right click", () => {
      const control = makeControl();

      function Harness() {
        const table = useDataTable<TestRow>({
          columns: [
            {
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

      const { container } = render(<Harness />, { wrapper });

      openHeaderContextMenu(container, "Name");

      expect(screen.getByRole("menuitem", { name: "Copy label" })).toBeDefined();
      expect(screen.getByRole("menuitem", { name: "Pin column" })).toBeDefined();
      expect(screen.getByRole("menuitem", { name: "Sort column" })).toBeDefined();
      expect(screen.queryByRole("menuitem", { name: "Hide column" })).toBeNull();
    });

    it("copies the column label", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText },
      });

      const { container } = render(<TestDataTable />, { wrapper });

      openHeaderContextMenu(container, "Name");
      fireEvent.click(screen.getByRole("menuitem", { name: "Copy label" }));

      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith("Name");
      });
    });

    it("pins a column to the right from the pin submenu", async () => {
      const user = userEvent.setup();
      const columns: Column<TestRow>[] = [
        { id: "name", label: "Name", width: 100, render: (row) => row.name },
        { id: "status", label: "Status", width: 100, render: (row) => row.status },
      ];
      const { container } = render(<TestDataTable columns={columns} />, { wrapper });

      openHeaderContextMenu(container, "Name");
      hoverMenuItem("Pin column");
      await user.click(await screen.findByRole("menuitem", { name: "Pin to right" }));

      await waitFor(() => {
        expect(headByText(container, "Name")?.style.position).toBe("sticky");
        expect(headByText(container, "Name")?.style.right).toBe("0px");
      });
    });

    it("unpins a fixed column from the pin submenu", async () => {
      const user = userEvent.setup();
      const columns: Column<TestRow>[] = [
        { id: "name", label: "Name", width: 100, pin: "left", render: (row) => row.name },
        { id: "status", label: "Status", width: 100, render: (row) => row.status },
      ];
      const { container } = render(<TestDataTable columns={columns} />, { wrapper });

      expect(headByText(container, "Name")?.style.position).toBe("sticky");
      expect(headByText(container, "Name")?.style.left).toBe("0px");

      openHeaderContextMenu(container, "Name");
      hoverMenuItem("Pin column");
      await user.click(await screen.findByRole("menuitem", { name: "Unpin" }));

      await waitFor(() => {
        expect(headByText(container, "Name")?.style.position).toBe("");
        expect(headByText(container, "Name")?.style.left).toBe("");
      });
    });

    it("sorts a column from the sort submenu", async () => {
      const user = userEvent.setup();
      const control = makeControl();

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
          control,
        });

        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }

      const { container } = render(<Harness />, { wrapper });

      openHeaderContextMenu(container, "Name");
      hoverMenuItem("Sort column");
      await user.click(await screen.findByRole("menuitem", { name: "Descending" }));

      await waitFor(() => {
        expect(control.clearSort).toHaveBeenCalledTimes(1);
        expect(control.setSort).toHaveBeenCalledWith("name", "Desc");
      });
    });

    it("resets sort from the sort submenu", async () => {
      const user = userEvent.setup();
      const control = makeControl({
        sortStates: [{ field: "name", direction: "Asc" }],
      });

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
          control,
        });

        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }

      const { container } = render(<Harness />, { wrapper });

      openHeaderContextMenu(container, "Name");
      hoverMenuItem("Sort column");
      await user.click(await screen.findByRole("menuitem", { name: "Reset sort" }));

      await waitFor(() => {
        expect(control.clearSort).not.toHaveBeenCalled();
        expect(control.setSort).toHaveBeenCalledWith("name", undefined);
      });
    });
  });

  describe("cell context menu", () => {
    it("shows copy actions and filter submenu for filterable cells", () => {
      const control = makeControl();

      function Harness() {
        const table = useDataTable<TestRow>({
          columns: [
            {
              label: "Name",
              render: (row) => row.name,
              filter: { type: "string", field: "name", operators: ["eq", "contains"] },
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

      openCellContextMenu(container, "Alice");

      expect(screen.getByRole("menuitem", { name: "Copy value" })).toBeDefined();
      expect(screen.getByRole("menuitem", { name: "Copy header and value" })).toBeDefined();
      expect(screen.getByRole("menuitem", { name: "Add filter" })).toBeDefined();
    });

    it("copies the cell value", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText },
      });

      const { container } = render(<TestDataTable />, { wrapper });

      openCellContextMenu(container, "Alice");
      fireEvent.click(screen.getByRole("menuitem", { name: "Copy value" }));

      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith("Alice");
      });
    });

    it("copies the header and cell value", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText },
      });

      const { container } = render(<TestDataTable />, { wrapper });

      openCellContextMenu(container, "Alice");
      fireEvent.click(screen.getByRole("menuitem", { name: "Copy header and value" }));

      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith("Name Alice");
      });
    });

    it("adds a filter from the cell value", async () => {
      const user = userEvent.setup();
      const control = makeControl();

      function Harness() {
        const table = useDataTable<TestRow>({
          columns: [
            {
              label: "Name",
              render: (row) => row.name,
              filter: { type: "string", field: "name", operators: ["eq", "contains"] },
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

      openCellContextMenu(container, "Alice");
      hoverMenuItem("Add filter");
      await user.click(await screen.findByRole("menuitem", { name: "contains" }));

      expect(control.addFilter).toHaveBeenCalledWith("name", "contains", "Alice");
    });

    it("preserves decimal strings when filtering by a cell value", async () => {
      const user = userEvent.setup();
      const control = makeControl();
      const amount = "9007199254740993.123456789";
      function Harness() {
        const table = useDataTable<{ amount: string }>({
          columns: [
            { id: "amount", label: "Amount", filter: { type: "decimal", field: "amount" } },
          ],
          data: { rows: [{ amount }] },
          control,
        });
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      const { container } = render(<Harness />, { wrapper });
      openCellContextMenu(container, amount);
      hoverMenuItem("Add filter");
      await user.click(await screen.findByRole("menuitem", { name: "is" }));
      expect(control.addFilter).toHaveBeenCalledWith("amount", "eq", amount);
    });

    it.each([
      ["2026-10-09T01:00:00Z", "Oct 8, 2026, 6:00 PM", "2026-10-09T01:00:00.000Z"],
      ["2026-10-09T10:00:00+09:00", "Oct 8, 2026, 6:00 PM", "2026-10-09T01:00:00.000Z"],
      ["2026-10-09T00:00:00", "Oct 9, 2026, 12:00 AM", "2026-10-09T07:00:00.000Z"],
      ["2026-10-09T00:00", "Oct 9, 2026, 12:00 AM", "2026-10-09T07:00:00.000Z"],
      [new Date("2026-10-09T01:00:00Z"), "Oct 8, 2026, 6:00 PM", "2026-10-09T01:00:00.000Z"],
      [Date.parse("2026-10-09T01:00:00Z"), "Oct 8, 2026, 6:00 PM", "2026-10-09T01:00:00.000Z"],
    ])(
      "uses the AppShell timezone for the cell and datetime filter from %s",
      async (value, displayed, instant) => {
        stubBrowserTimeZone();
        const user = userEvent.setup();
        const control = makeControl();
        type Row = { id: string; createdAt: string | Date | number };

        function Harness() {
          const table = useDataTable<Row>({
            columns: [
              {
                id: "createdAt",
                label: "Created At",
                type: "date",
                accessor: (row) => row.createdAt,
                typeOptions: { locale: "en-US", dateFormat: "datetime" },
                filter: { type: "datetime", field: "createdAt", operators: ["eq"] },
              },
            ],
            data: { rows: [{ id: "1", createdAt: value }] },
            control,
          });
          return (
            <DataTable.Root value={table}>
              <DataTable.Table />
            </DataTable.Root>
          );
        }

        const { container } = render(<Harness />, {
          wrapper: createTimeZoneWrapper("America/Los_Angeles"),
        });
        expect(cellByText(container, displayed)).toBeDefined();
        openCellContextMenu(container, displayed);
        hoverMenuItem("Add filter");
        await user.click(await screen.findByRole("menuitem", { name: "is" }));
        expect(control.addFilter).toHaveBeenCalledWith("createdAt", "eq", instant);
      },
    );

    it.each(["America/Los_Angeles", "Asia/Tokyo"])(
      "preserves date-only cells and filters in %s",
      async (timeZone) => {
        stubBrowserTimeZone();
        const user = userEvent.setup();
        const control = makeControl();
        type Row = { id: string; placedOn: string };

        function Harness() {
          const table = useDataTable<Row>({
            columns: [
              {
                id: "placedOn",
                label: "Placed On",
                type: "date",
                accessor: (row) => row.placedOn,
                typeOptions: { locale: "en-US" },
                filter: { type: "date", field: "placedOn", operators: ["eq"] },
              },
            ],
            data: { rows: [{ id: "1", placedOn: "2026-10-09" }] },
            control,
          });
          return (
            <DataTable.Root value={table}>
              <DataTable.Table />
            </DataTable.Root>
          );
        }

        const { container } = render(<Harness />, { wrapper: createTimeZoneWrapper(timeZone) });
        expect(cellByText(container, "Oct 9, 2026")).toBeDefined();
        openCellContextMenu(container, "Oct 9, 2026");
        hoverMenuItem("Add filter");
        await user.click(await screen.findByRole("menuitem", { name: "exact date" }));
        expect(control.addFilter).toHaveBeenCalledWith("placedOn", "eq", "2026-10-09");
      },
    );

    it("normalizes date filters from Date values in the AppShell timezone", async () => {
      stubBrowserTimeZone();
      const user = userEvent.setup();
      const control = makeControl();
      const value = new Date("2026-09-07T15:00:00.000Z");
      type Row = { id: string; label: string };

      function Harness() {
        const table = useDataTable<Row>({
          columns: [
            {
              id: "createdAt",
              label: "Created At",
              accessor: () => value,
              render: (row) => row.label,
              filter: { type: "date", field: "createdAt", operators: ["eq"] },
            },
          ],
          data: { rows: [{ id: "1", label: "Sep 8, 2026" }] },
          control,
        });

        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }

      const { container } = render(<Harness />, { wrapper: createTimeZoneWrapper("Asia/Tokyo") });

      openCellContextMenu(container, "Sep 8, 2026");
      hoverMenuItem("Add filter");
      await user.click(await screen.findByRole("menuitem", { name: "exact date" }));

      expect(control.addFilter).toHaveBeenCalledWith("createdAt", "eq", "2026-09-08");
    });

    it("omits Add filter when a temporal value cannot be normalized", () => {
      const control = makeControl();
      type Row = { id: string; opensAt: string };

      function Harness() {
        const table = useDataTable<Row>({
          columns: [
            {
              id: "opensAt",
              label: "Opens At",
              render: (row) => row.opensAt,
              filter: { type: "time", field: "opensAt", operators: ["eq"] },
            },
          ],
          data: { rows: [{ id: "1", opensAt: "not-a-time" }] },
          control,
        });

        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }

      const { container } = render(<Harness />, { wrapper });

      openCellContextMenu(container, "not-a-time");

      expect(screen.queryByRole("menuitem", { name: "Add filter" })).toBeNull();
    });
  });
});
