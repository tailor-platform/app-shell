import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { DataTable } from "./data-table";
import { useDataTable } from "./use-data-table";
import type { Column, UseDataTableOptions } from "./types";

afterEach(cleanup);

type Row = { id: string; name: string; hours: number };
const rows: Row[] = [
  { id: "1", name: "Alex", hours: 60 },
  { id: "2", name: "Sam", hours: 20 },
];
const wrapper = createAppShellWrapper("en");

function Harness(options: UseDataTableOptions<Row>) {
  const table = useDataTable(options);
  return (
    <DataTable.Root value={table}>
      <DataTable.Table />
    </DataTable.Root>
  );
}

const cell = (name: string) => screen.getByText(name).closest("td")!;

describe("DataTable cellProps", () => {
  it("limits the public contract to className, style, and title", () => {
    type CellProps = NonNullable<ReturnType<NonNullable<Column<Row>["cellProps"]>>>;
    expectTypeOf<CellProps>().toEqualTypeOf<
      Pick<ComponentProps<"td">, "className" | "style" | "title">
    >();
  });

  it.each(["built-in", "custom", "truncated", "editable"])(
    "styles the actual cell with a %s renderer",
    (mode) => {
      render(
        <Harness
          data={{ rows }}
          columns={[
            {
              id: "name",
              label: "Name",
              type: "text",
              render: mode === "custom" ? (row) => <strong>{row.name}</strong> : undefined,
              truncate: mode === "truncated",
              edit: mode === "editable" ? { onValueCommitted: vi.fn() } : undefined,
              cellProps: (row) => {
                expectTypeOf(row).toEqualTypeOf<Row>();
                return row.hours >= 40
                  ? {
                      className: "astw:tabular-nums",
                      style: { backgroundColor: "red", color: "white" },
                      title: `${row.hours} hours`,
                    }
                  : undefined;
              },
            },
          ]}
        />,
        { wrapper },
      );

      expect(cell("Alex").style.backgroundColor).toBe("red");
      expect(cell("Alex").style.color).toBe("white");
      expect(cell("Alex").className).toContain("astw:py-2");
      expect(cell("Alex").className).toContain("astw:tabular-nums");
      expect(cell("Alex").title).toBe("60 hours");
      expect(cell("Sam").style.backgroundColor).toBe("");
      expect(cell("Sam").title).toBe("");
      expect(cell("Sam").className).not.toContain("astw:tabular-nums");
      const header = screen.getByRole("columnheader");
      expect(header.style.backgroundColor).toBe("");
      expect(header.title).toBe("");
      expect(header.className).not.toContain("astw:tabular-nums");
    },
  );

  it.each(["left", "right"] as const)(
    "preserves %s pinning, width, and selection with a custom background",
    (pin) => {
      render(
        <Harness
          data={{ rows }}
          rowSelection={{}}
          columns={[
            {
              id: "name",
              label: "Name",
              type: "text",
              width: 140,
              pin,
              cellProps: () => ({
                className: "astw:bg-muted",
                style: {
                  backgroundColor: "red",
                  position: "relative",
                  [pin]: 999,
                  width: 999,
                },
              }),
            },
            { id: "hours", label: "Hours", type: "number" },
          ]}
        />,
        { wrapper },
      );

      const styled = cell("Alex");
      expect(styled.style.position).toBe("sticky");
      expect(styled.style[pin]).toBe(pin === "left" ? "52px" : "0px");
      expect(styled.style.width).toBe("140px");
      expect(styled.className).toContain(`data-pin-shadow-${pin}`);
      expect(styled.className.split(" ")).toContain("astw:bg-muted");
      expect(styled.className.split(" ")).not.toContain("astw:bg-card");
      expect(styled.className).toContain("astw:group-aria-selected:bg-muted");
      expect(styled.style.backgroundColor).toBe("red");
      fireEvent.click(screen.getAllByRole("checkbox", { name: "Select row" })[0]);
      expect(styled.closest("tr")?.getAttribute("aria-selected")).toBe("true");
      expect(styled.style.backgroundColor).toBe("red");
      expect(cell("60").style.backgroundColor).toBe("");
    },
  );

  it("recomputes and removes styles when row data changes", () => {
    const columns: Column<Row>[] = [
      {
        id: "name",
        type: "text",
        cellProps: (row) =>
          row.hours >= 40
            ? {
                className: "astw:tabular-nums",
                style: { backgroundColor: "red" },
                title: "High overtime",
              }
            : undefined,
      },
    ];
    const { rerender } = render(<Harness columns={columns} data={{ rows }} />, { wrapper });
    expect(cell("Alex").style.backgroundColor).toBe("red");
    rerender(<Harness columns={columns} data={{ rows: [{ ...rows[0], hours: 20 }] }} />);
    expect(cell("Alex").style.backgroundColor).toBe("");
    expect(cell("Alex").title).toBe("");
    expect(cell("Alex").className).not.toContain("astw:tabular-nums");
  });

  it.each([{ loading: true }, { data: { rows: [] } }, { error: new Error("Failed") }])(
    "does not evaluate row styling for status or loading cells (%j)",
    (state) => {
      const cellProps = vi.fn(() => ({ style: { backgroundColor: "red" } }));
      render(
        <Harness columns={[{ id: "name", type: "text", cellProps }]} data={{ rows }} {...state} />,
        { wrapper },
      );
      expect(cellProps).not.toHaveBeenCalled();
    },
  );
});

describe("DataTable headerProps", () => {
  it("accepts only a static object with className, style, and title", () => {
    expectTypeOf<NonNullable<Column<Row>["headerProps"]>>().toEqualTypeOf<
      Pick<ComponentProps<"th">, "className" | "style" | "title">
    >();
  });

  it.each([false, true])("styles the actual header with custom content=%s", (custom) => {
    render(
      <Harness
        data={{ rows }}
        rowSelection={{}}
        columns={[
          {
            id: "name",
            label: "Name",
            type: "text",
            header: custom ? () => <strong>Person</strong> : undefined,
            headerProps: {
              className: "astw:tabular-nums",
              style: { backgroundColor: "red", color: "white" },
              title: "Employee name",
            },
          },
          { id: "hours", label: "Hours", type: "number" },
        ]}
      />,
      { wrapper },
    );

    const header = screen.getByText(custom ? "Person" : "Name").closest("th")!;
    expect(header.style.backgroundColor).toBe("red");
    expect(header.style.color).toBe("white");
    expect(header.title).toBe("Employee name");
    expect(header.className).toContain("astw:px-2");
    expect(header.className).toContain("astw:tabular-nums");
    expect(cell("Alex").style.backgroundColor).toBe("");
    expect(cell("Alex").title).toBe("");
    for (const other of screen.getAllByRole("columnheader").filter((th) => th !== header)) {
      expect(other.style.backgroundColor).toBe("");
      expect(other.title).toBe("");
      expect(other.className).not.toContain("astw:tabular-nums");
    }
  });

  it.each(["left", "right"] as const)("preserves %s header pinning and width", (pin) => {
    render(
      <Harness
        data={{ rows }}
        rowSelection={{}}
        columns={[
          {
            id: "name",
            label: "Name",
            type: "text",
            width: 140,
            pin,
            headerProps: {
              className: "astw:bg-muted",
              style: { backgroundColor: "red", position: "relative", [pin]: 999, width: 999 },
            },
          },
        ]}
      />,
      { wrapper },
    );

    const header = screen.getByText("Name").closest("th")!;
    expect(header.style.position).toBe("sticky");
    expect(header.style[pin]).toBe(pin === "left" ? "52px" : "0px");
    expect(header.style.width).toBe("140px");
    expect(header.style.backgroundColor).toBe("red");
    expect(header.className.split(" ")).toContain("astw:bg-muted");
    expect(header.className.split(" ")).not.toContain("astw:bg-card");
    expect(header.className).toContain(`data-pin-shadow-${pin}`);
  });

  it("removes header customizations when the column definition changes", () => {
    const column: Column<Row> = { id: "name", label: "Name", type: "text" };
    const { rerender } = render(
      <Harness
        data={{ rows }}
        columns={[
          {
            ...column,
            headerProps: {
              className: "astw:tabular-nums",
              style: { backgroundColor: "red" },
              title: "Employee name",
            },
          },
        ]}
      />,
      { wrapper },
    );
    expect(screen.getByRole("columnheader").title).toBe("Employee name");
    rerender(<Harness data={{ rows }} columns={[column]} />);
    const header = screen.getByRole("columnheader");
    expect(header.style.backgroundColor).toBe("");
    expect(header.title).toBe("");
    expect(header.className).not.toContain("astw:tabular-nums");
  });
});
