import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { AppShellConfigContext, buildConfigurations } from "@/contexts/appshell-context";
import { DataTable } from "./data-table";
import { useDataTable } from "./use-data-table";
import type { Column, DateCellOptions } from "./types";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

type Row = { id: string; value: unknown };
const noop = () => {};
const rows: Row[] = [
  { id: "1", value: "2026-10-09" },
  { id: "2", value: "2026-10-09T00:00:00Z" },
  { id: "3", value: "2026-10-10" },
  { id: "4", value: "2026-10-10T00:00:00Z" },
];

function dateColumn(
  options: DateCellOptions = { locale: "en-US", dateFormat: "datetime" },
): Column<Row> {
  return {
    id: "value",
    label: "Date",
    type: "date",
    typeOptions: options,
    edit: { onValueCommitted: noop },
  };
}

function Harness({
  data = rows,
  columns,
  timeZone = "America/New_York",
}: {
  data?: Row[];
  columns: Column<Row>[];
  timeZone?: string;
}) {
  const table = useDataTable<Row>({ columns, data: { rows: data } });
  return (
    <MemoryRouter>
      <AppShellConfigContext.Provider
        value={{ configurations: buildConfigurations({ modules: [], locale: "en", timeZone }) }}
      >
        <DataTable.Root value={table}>
          <DataTable.Table />
        </DataTable.Root>
      </AppShellConfigContext.Provider>
    </MemoryRouter>
  );
}

function spyOnCellFormatters() {
  const DateTimeFormat = Intl.DateTimeFormat;
  const spy = vi.spyOn(Intl, "DateTimeFormat").mockImplementation(function (locales, options) {
    return new DateTimeFormat(locales, options);
  });
  // Exclude temporal-helper caches and the Calendar's heading / accessible-date formatters.
  const cellCalls = () =>
    spy.mock.calls.filter(
      ([locale, options]) =>
        (locale === "en-US" || locale === "de-DE") &&
        options?.year === "numeric" &&
        options.day === "numeric" &&
        (options.month === "short" || options.month === "long") &&
        options.weekday === undefined,
    );
  return { cellCalls };
}

describe("editable date formatter caching", () => {
  it("shares date-only and zoned formatters across editable rows, data updates, and picker changes", async () => {
    const { cellCalls } = spyOnCellFormatters();
    const columns = [dateColumn()];
    const user = userEvent.setup();
    const { rerender } = render(<Harness columns={columns} />);
    expect(new Set(cellCalls().map(([, options]) => options?.timeZone))).toEqual(
      new Set(["UTC", "America/New_York"]),
    );
    const initialCount = cellCalls().length;

    const nextRows = [...rows, { id: "5", value: "2026-10-11T00:00:00Z" }];
    rerender(<Harness columns={columns} data={nextRows} />);
    expect(cellCalls()).toHaveLength(initialCount);

    await user.click(screen.getByRole("button", { name: "Date, Oct 8, 2026, 8:00 PM" }));
    expect(cellCalls()).toHaveLength(initialCount);
    fireEvent.change(screen.getByLabelText("Date (Choose time)"), { target: { value: "14:30" } });
    expect(cellCalls()).toHaveLength(initialCount);
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(cellCalls()).toHaveLength(initialCount);
    expect(screen.getByRole("button", { name: "Date, Oct 8, 2026, 8:00 PM" })).toBeDefined();
  });

  it("refreshes cached formatters and display for timezone, date format, and locale changes", () => {
    const { cellCalls } = spyOnCellFormatters();
    const data = rows.slice(0, 2);
    const columns = [dateColumn({ locale: "en-US", dateFormat: "short" })];
    const { rerender } = render(<Harness columns={columns} data={data} />);
    const initialCount = cellCalls().length;
    expect(initialCount).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Date, Oct 8, 2026" })).toBeDefined();

    rerender(<Harness columns={columns} data={data} timeZone="Asia/Tokyo" />);
    const zonedCount = cellCalls().length;
    expect(zonedCount).toBeGreaterThan(initialCount);
    expect(screen.queryByRole("button", { name: "Date, Oct 8, 2026" })).toBeNull();
    expect(screen.getAllByRole("button", { name: "Date, Oct 9, 2026" })).toHaveLength(2);

    const longColumns = [dateColumn({ locale: "en-US", dateFormat: "long" })];
    rerender(<Harness columns={longColumns} data={data} timeZone="Asia/Tokyo" />);
    const longCount = cellCalls().length;
    expect(longCount).toBeGreaterThan(zonedCount);
    expect(screen.getAllByRole("button", { name: "Date, October 9, 2026" })).toHaveLength(2);

    const germanColumns = [dateColumn({ locale: "de-DE", dateFormat: "long" })];
    rerender(<Harness columns={germanColumns} data={data} timeZone="Asia/Tokyo" />);
    expect(cellCalls().length).toBeGreaterThan(longCount);
    expect(screen.getAllByRole("button", { name: "Date, 9. Oktober 2026" })).toHaveLength(2);
  });

  it("does not construct cell formatters for empty or invalid values", () => {
    const { cellCalls } = spyOnCellFormatters();
    const columns = [dateColumn()];
    const data = [
      null,
      undefined,
      "",
      "not-a-date",
      "2026-02-30",
      new Date(Number.NaN),
      Number.NaN,
    ].map((value, index) => ({ id: String(index), value }));
    const { rerender } = render(<Harness columns={columns} data={data} />);
    expect(screen.getAllByText("—")).toHaveLength(data.length);
    expect(cellCalls()).toHaveLength(0);
    rerender(<Harness columns={columns} data={[...data]} />);
    expect(cellCalls()).toHaveLength(0);
  });

  it("keeps a custom date renderer authoritative, including null output", () => {
    const { cellCalls } = spyOnCellFormatters();
    const columns: Column<Row>[] = [
      {
        id: "value",
        label: "Custom date",
        type: "date",
        typeOptions: { locale: "not a locale" },
        render: (row) => (row.id === "1" ? "Custom renderer" : null),
        edit: { onValueCommitted: noop },
      },
    ];
    const { rerender } = render(<Harness columns={columns} data={rows.slice(0, 2)} />);
    expect(screen.getByText("Custom renderer")).toBeDefined();
    expect(screen.getByRole("button", { name: "Custom date, Custom renderer" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Custom date" })).toBeDefined();
    expect(cellCalls()).toHaveLength(0);
    rerender(<Harness columns={columns} data={rows.slice(0, 2)} timeZone="Asia/Tokyo" />);
    expect(cellCalls()).toHaveLength(0);
  });
});
