import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { ReactNode } from "react";
import { resetLocalTimeZone } from "@internationalized/date";
import { AppShellConfigContext, buildConfigurations } from "@/contexts/appshell-context";
import { DataTable } from "./data-table";
import { useDataTable } from "./use-data-table";
import type { Column } from "./types";
import { wrapper, createTimeZoneWrapper, stubBrowserTimeZone } from "./test-utils";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  resetLocalTimeZone();
  vi.restoreAllMocks();
});

describe("DataTable", () => {
  it("renders editable and read-only dates in the same AppShell timezone", () => {
    stubBrowserTimeZone();
    type Row = { id: string; value: string };
    function Harness() {
      const table = useDataTable<Row>({
        columns: [
          {
            id: "value",
            label: "Date",
            type: "date",
            typeOptions: { locale: "en-US" },
            edit: { canEdit: (row) => row.id === "1", onValueCommitted: vi.fn() },
          },
        ],
        data: {
          rows: [
            { id: "1", value: "2026-10-09T00:00:00Z" },
            { id: "2", value: "2026-10-09T00:00:00Z" },
            { id: "3", value: "2026-10-09" },
          ],
        },
      });
      return (
        <DataTable.Root value={table}>
          <DataTable.Table />
        </DataTable.Root>
      );
    }
    render(<Harness />, { wrapper: createTimeZoneWrapper("America/New_York") });
    expect(screen.getAllByText("Oct 8, 2026")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Date, Oct 8, 2026" })).toBeDefined();
    expect(screen.getByText("Oct 9, 2026")).toBeDefined();
  });

  it("reuses date formatters on row updates and refreshes them for column or timezone changes", () => {
    const DateTimeFormat = Intl.DateTimeFormat;
    const formatterSpy = vi
      .spyOn(Intl, "DateTimeFormat")
      .mockImplementation(function (locales, options) {
        return new DateTimeFormat(locales, options);
      });
    type Row = { id: string; value: string };
    const columns: Column<Row>[] = [
      { id: "value", type: "date", typeOptions: { locale: "en-US" } },
      {
        id: "custom",
        type: "date",
        typeOptions: { locale: "not a locale" },
        render: () => "Custom renderer",
      },
    ];
    const rows = [
      { id: "1", value: "2026-10-09" },
      { id: "2", value: "2026-10-09T00:00:00Z" },
    ];
    function Harness({
      rows: currentRows,
      columns: currentColumns,
      timeZone,
    }: {
      rows: Row[];
      columns: Column<Row>[];
      timeZone: string;
    }) {
      const table = useDataTable<Row>({ columns: currentColumns, data: { rows: currentRows } });
      return (
        <AppShellConfigContext.Provider
          value={{ configurations: buildConfigurations({ modules: [], locale: "en", timeZone }) }}
        >
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        </AppShellConfigContext.Provider>
      );
    }
    const formatterCount = () =>
      formatterSpy.mock.calls.filter(
        ([, options]) => options?.month === "short" || options?.month === "long",
      ).length;
    const { rerender } = render(
      <Harness rows={rows} columns={columns} timeZone="America/New_York" />,
    );
    expect(screen.getByText("Oct 8, 2026")).toBeDefined();
    const initialCount = formatterCount();
    expect(initialCount).toBeGreaterThan(0);

    const nextRows = [...rows, { id: "3", value: "2026-10-10" }];
    rerender(<Harness rows={nextRows} columns={columns} timeZone="America/New_York" />);
    expect(screen.getByText("Oct 10, 2026")).toBeDefined();
    expect(formatterCount()).toBe(initialCount);

    rerender(<Harness rows={nextRows} columns={columns} timeZone="Asia/Tokyo" />);
    expect(screen.queryByText("Oct 8, 2026")).toBeNull();
    const zonedCount = formatterCount();
    expect(zonedCount).toBeGreaterThan(initialCount);

    const nextColumns: Column<Row>[] = [
      { id: "value", type: "date", typeOptions: { locale: "de-DE", dateFormat: "long" } },
    ];
    rerender(<Harness rows={nextRows} columns={nextColumns} timeZone="Asia/Tokyo" />);
    expect(screen.getAllByText("9. Oktober 2026")).toHaveLength(2);
    expect(formatterCount()).toBeGreaterThan(zonedCount);
  });

  describe("column type renderers", () => {
    type TypedRow = {
      id: string;
      name: string | null;
      total: number | null;
      currency: string;
      placedAt: string | null;
      status: string;
      detailUrl: string | null;
    };

    const typedRows: TypedRow[] = [
      {
        id: "1",
        name: "Order 1",
        total: 1234.5,
        currency: "USD",
        placedAt: "2026-04-09T12:00:00Z",
        status: "shipped",
        detailUrl: "/orders/1",
      },
      {
        id: "2",
        name: null,
        total: null,
        currency: "JPY",
        placedAt: null,
        status: "unknown",
        detailUrl: null,
      },
    ];

    function renderTypedTable(columns: Column<TypedRow>[]) {
      function Harness() {
        const table = useDataTable<TypedRow>({
          columns,
          data: { rows: typedRows },
        });
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      return render(<Harness />, { wrapper });
    }

    it("renders text cells with — placeholder for null values", () => {
      const { container } = renderTypedTable([
        { label: "Name", type: "text", accessor: (r) => r.name },
      ]);
      expect(container.textContent).toContain("Order 1");
      expect(container.textContent).toContain("—");
    });

    it("renders money cells with currency formatting", () => {
      const { container } = renderTypedTable([
        {
          label: "Total",
          type: "money",
          accessor: (r) => r.total,
          typeOptions: { currency: "USD", locale: "en-US" },
        },
      ]);
      expect(container.textContent).toContain("$1,234.50");
    });

    it("reads currency from row via function accessor", () => {
      const { container } = renderTypedTable([
        {
          label: "Total",
          type: "money",
          accessor: (r) => r.total ?? 0,
          typeOptions: { currency: (r) => r.currency, locale: "en-US" },
        },
      ]);
      // First row: USD 1234.5 → "$1,234.50". Second row: JPY 0 → "¥0".
      expect(container.textContent).toContain("$1,234.50");
      expect(container.textContent).toContain("¥0");
    });

    it("renders date cells with short format by default", () => {
      const { container } = renderTypedTable([
        {
          label: "Placed",
          type: "date",
          accessor: (r) => r.placedAt,
          typeOptions: { locale: "en-US" },
        },
      ]);
      expect(container.textContent).toMatch(/Apr 9, 2026/);
    });

    it("renders badge cells via variant/label maps", () => {
      const { container } = renderTypedTable([
        {
          label: "Status",
          type: "badge",
          accessor: (r) => r.status,
          typeOptions: {
            badgeVariantMap: { shipped: "success" },
            badgeLabelMap: { shipped: "Shipped" },
          },
        },
      ]);
      expect(container.textContent).toContain("Shipped");
      // Unknown values still render but with default variant + raw label
      expect(container.textContent).toContain("unknown");
    });

    it("renders multiple badges from array accessor", () => {
      const rows = [
        {
          id: "1",
          name: "Item",
          tags: ["urgent", "fragile"],
          status: "shipped",
          amount: 100,
          date: "2026-01-01",
          detailUrl: "/items/1",
        },
      ];
      function Harness() {
        const table = useDataTable<(typeof rows)[number]>({
          columns: [
            {
              label: "Tags",
              type: "badge",
              accessor: (r) => r.tags,
              typeOptions: {
                badgeVariantMap: { urgent: "error", fragile: "warning" },
              },
            },
          ],
          data: { rows },
        });
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      const { container } = render(<Harness />, { wrapper });
      expect(container.textContent).toContain("urgent");
      expect(container.textContent).toContain("fragile");
    });

    it("renders maxVisible badges with +N overflow in DataTable", () => {
      const rows = [
        {
          id: "1",
          name: "Item",
          tags: ["a", "b", "c", "d"],
          status: "shipped",
          amount: 100,
          date: "2026-01-01",
          detailUrl: "/items/1",
        },
      ];
      function Harness() {
        const table = useDataTable<(typeof rows)[number]>({
          columns: [
            {
              label: "Tags",
              type: "badge",
              accessor: (r) => r.tags,
              typeOptions: { maxVisible: 2 },
            },
          ],
          data: { rows },
        });
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      const { container } = render(<Harness />, { wrapper });
      expect(container.textContent).toContain("a");
      expect(container.textContent).toContain("b");
      expect(container.textContent).toContain("+2");
      expect(container.textContent).not.toContain("c");
      expect(container.textContent).not.toContain("d");
    });

    it("renders placeholder for empty array in badge column", () => {
      const rows = [
        {
          id: "1",
          name: "Item",
          tags: [] as string[],
          status: "shipped",
          amount: 100,
          date: "2026-01-01",
          detailUrl: "/items/1",
        },
      ];
      function Harness() {
        const table = useDataTable<(typeof rows)[number]>({
          columns: [
            {
              label: "Tags",
              type: "badge",
              accessor: (r) => r.tags,
            },
          ],
          data: { rows },
        });
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      const { container } = render(<Harness />, { wrapper });
      expect(container.textContent).toContain("—");
    });

    it("renders placeholder for array of all-null values in badge column", () => {
      const rows = [
        {
          id: "1",
          name: "Item",
          tags: [null, null] as (string | null)[],
          status: "shipped",
          amount: 100,
          date: "2026-01-01",
          detailUrl: "/items/1",
        },
      ];
      function Harness() {
        const table = useDataTable<(typeof rows)[number]>({
          columns: [
            {
              label: "Tags",
              type: "badge",
              accessor: (r) => r.tags as unknown as string[],
            },
          ],
          data: { rows },
        });
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      const { container } = render(<Harness />, { wrapper });
      expect(container.textContent).toContain("—");
    });

    it("renders placeholder for array of empty strings in badge column", () => {
      const rows = [
        {
          id: "1",
          name: "Item",
          tags: ["", ""],
          status: "shipped",
          amount: 100,
          date: "2026-01-01",
          detailUrl: "/items/1",
        },
      ];
      function Harness() {
        const table = useDataTable<(typeof rows)[number]>({
          columns: [
            {
              label: "Tags",
              type: "badge",
              accessor: (r) => r.tags,
            },
          ],
          data: { rows },
        });
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      const { container } = render(<Harness />, { wrapper });
      expect(container.textContent).toContain("—");
    });

    it("renders link cells with anchor when href is provided", () => {
      function RouterWrapper({ children }: { children: ReactNode }) {
        return <MemoryRouter>{wrapper({ children })}</MemoryRouter>;
      }
      function Harness() {
        const table = useDataTable<TypedRow>({
          columns: [
            {
              label: "Name",
              type: "link",
              accessor: (r) => r.name,
              typeOptions: { href: (r) => r.detailUrl },
            },
          ],
          data: { rows: typedRows },
        });
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      const { container } = render(<Harness />, { wrapper: RouterWrapper });
      const anchor = container.querySelector("a[href='/orders/1']");
      expect(anchor).not.toBeNull();
      expect(anchor?.textContent).toBe("Order 1");
    });

    it("falls back to row[id] when accessor is omitted", () => {
      const { container } = renderTypedTable([{ id: "name", type: "text" }]);
      expect(container.textContent).toContain("Order 1");
    });

    it("renders boolean as ✓/✗ when no type is set", () => {
      type BoolRow = { id: string; active: boolean };
      const rows: BoolRow[] = [
        { id: "1", active: true },
        { id: "2", active: false },
      ];
      function Harness() {
        const table = useDataTable<BoolRow>({
          columns: [{ id: "active", label: "Active", accessor: (r) => r.active }],
          data: { rows },
        });
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      const { container } = render(<Harness />, { wrapper });
      expect(container.textContent).toContain("✓");
      expect(container.textContent).toContain("✗");
    });

    it("renders Date as locale string when no type is set", () => {
      type DateRow = { id: string; createdAt: Date };
      const date = new Date("2026-03-15T00:00:00Z");
      const rows: DateRow[] = [{ id: "1", createdAt: date }];
      function Harness() {
        const table = useDataTable<DateRow>({
          columns: [{ id: "createdAt", label: "Created", accessor: (r) => r.createdAt }],
          data: { rows },
        });
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      const { container } = render(<Harness />, { wrapper });
      expect(container.textContent).toContain(date.toLocaleDateString());
    });

    it("renders object as JSON when no type is set", () => {
      type ObjRow = { id: string; meta: Record<string, unknown> };
      const rows: ObjRow[] = [{ id: "1", meta: { foo: "bar" } }];
      function Harness() {
        const table = useDataTable<ObjRow>({
          columns: [{ id: "meta", label: "Meta", accessor: (r) => r.meta }],
          data: { rows },
        });
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      const { container } = render(<Harness />, { wrapper });
      expect(container.textContent).toContain('{"foo":"bar"}');
    });

    it("explicit render overrides type renderer", () => {
      const { container } = renderTypedTable([
        {
          label: "Status",
          type: "badge",
          accessor: (r) => r.status,
          render: (r) => <span data-testid="custom">{r.status.toUpperCase()}</span>,
        },
      ]);
      expect(container.querySelector("[data-testid='custom']")).not.toBeNull();
      expect(container.textContent).toContain("SHIPPED");
    });

    // Compile-time tests — these assertions verify the discriminated-union
    // shape rejects wrong-type options. Runtime behavior is incidental.
    it("[types] rejects wrong-type options on each branch", () => {
      const moneyCol: Column<TypedRow> = {
        type: "money",
        accessor: (r) => r.total,
        // @ts-expect-error — badgeVariantMap is not a money option
        typeOptions: { badgeVariantMap: { shipped: "success" } },
      };
      const badgeCol: Column<TypedRow> = {
        type: "badge",
        accessor: (r) => r.status,
        // @ts-expect-error — currency is not a badge option
        typeOptions: { currency: "USD" },
      };
      // @ts-expect-error — text columns reject typeOptions entirely
      const textCol: Column<TypedRow> = {
        type: "text",
        accessor: (r) => r.name,
        typeOptions: { locale: "en-US" },
      };
      // Reference the variables so the binding isn't elided.
      expect([moneyCol, badgeCol, textCol]).toHaveLength(3);
    });

    it("[types] requires href on link columns", () => {
      // @ts-expect-error — link branch requires typeOptions.href
      const linkColMissingHref: Column<TypedRow> = {
        type: "link",
        accessor: (r) => r.name,
      };
      const linkColOk: Column<TypedRow> = {
        type: "link",
        accessor: (r) => r.name,
        typeOptions: { href: (r) => r.detailUrl },
      };
      expect([linkColMissingHref, linkColOk]).toHaveLength(2);
    });

    it("[types] rejects array and object accessor return values on typed branches", () => {
      // Each typed branch narrows accessor's return type to values its
      // renderer can display. Arrays and plain objects are compile errors —
      // the built-in renderers never produced anything useful for them. Pass
      // `render` (and drop `type`) when the cell value isn't a primitive.

      // @ts-expect-error — text accessor cannot return an array
      const textArr: Column<TypedRow> = {
        type: "text",
        accessor: () => [1, 2],
      };
      // @ts-expect-error — text accessor cannot return a plain object
      const textObj: Column<TypedRow> = {
        type: "text",
        accessor: () => ({ a: 1 }),
      };
      // @ts-expect-error — number accessor cannot return an object
      const numberObj: Column<TypedRow> = {
        type: "number",
        accessor: () => ({ value: 1 }),
      };
      // @ts-expect-error — money accessor cannot return an array
      const moneyArr: Column<TypedRow> = {
        type: "money",
        accessor: () => [100],
      };
      // @ts-expect-error — date accessor cannot return an array
      const dateArr: Column<TypedRow> = {
        type: "date",
        accessor: () => [2026, 5, 13],
      };
      // badge accessor CAN return an array (multi-badge support)
      const badgeArr: Column<TypedRow> = {
        type: "badge",
        accessor: () => ["a", "b"],
      };
      // @ts-expect-error — link accessor cannot return a plain object
      const linkObj: Column<TypedRow> = {
        type: "link",
        accessor: () => ({ label: "x" }),
        typeOptions: { href: () => "/x" },
      };

      // Date is allowed on the date branch (and only there).
      const dateOk: Column<TypedRow> = {
        type: "date",
        accessor: () => new Date(),
      };
      // The untyped branch keeps `unknown` — callers escape the built-in
      // renderer entirely by providing `render`, so any return is fine.
      const untypedAny: Column<TypedRow> = {
        accessor: () => ({ shape: "anything" }),
        render: () => null,
      };

      expect([
        textArr,
        textObj,
        numberObj,
        moneyArr,
        dateArr,
        badgeArr,
        linkObj,
        dateOk,
        untypedAny,
      ]).toHaveLength(9);
    });
  });
});
