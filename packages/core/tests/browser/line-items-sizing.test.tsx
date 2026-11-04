import { useRef, useState, type CSSProperties } from "react";
import { fireEvent, render } from "@testing-library/react";
import { Input, Table } from "@tailor-platform/app-shell";
import { beforeEach, describe, expect, it } from "vitest";
import type { SizingColumn } from "../../src/components/line-items/column-sizing";
import { useColumnSizing } from "../../src/components/line-items/use-column-sizing";

type TestColumn = SizingColumn & { pin?: "left" | "right" };
const mixed: readonly TestColumn[] = [
  { id: "fixed", width: 120.5, pin: "left" },
  { id: "auto", pin: "left" },
  { id: "first", width: "flex" },
  { id: "second", width: "flex", pin: "right" },
];
const longLabel = "A much longer description in a newly mounted document line";

function Fixture({
  columns = mixed,
  width = 900,
  footer = "Total",
  label = "Description",
  nested = false,
  windowed = false,
  hidden = false,
  scope = "document-one",
}: {
  columns?: readonly TestColumn[];
  width?: number;
  footer?: string;
  label?: string;
  nested?: boolean;
  windowed?: boolean;
  hidden?: boolean;
  scope?: string;
}) {
  const tableRef = useRef<HTMLTableElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sizing = useColumnSizing(tableRef, containerRef, columns, scope);
  const [start, setStart] = useState(0);
  const count = windowed ? 6 : 1;
  const total = windowed ? 100 : 1;
  function content(column: TestColumn, row: number) {
    if (column.id === "auto") {
      return <span data-testid={`label-${row}`}>{windowed && row === 50 ? longLabel : label}</span>;
    }
    if (column.id === "fixed" && row === 0) {
      return (
        <Input aria-label="Draft" defaultValue="draft" style={{ width: "100%", minWidth: 0 }} />
      );
    }
    return "Value";
  }
  function pinned(index: number): CSSProperties {
    const column = columns[index]!;
    if (!column.pin) return {};
    const siblings = column.pin === "left" ? columns.slice(0, index) : columns.slice(index + 1);
    const offset = siblings
      .filter((item) => item.pin === column.pin)
      .reduce((sum, item) => sum + sizing.widths.get(item.id)!, 0);
    return { position: "sticky", [column.pin]: offset, background: "white" };
  }
  return (
    <div
      style={{ width, display: hidden ? "none" : undefined }}
      onScrollCapture={(event) => {
        if (windowed && event.target === containerRef.current) {
          setStart(
            Math.min(
              total - count,
              Math.max(0, Math.floor((containerRef.current.scrollTop - 40) / 32)),
            ),
          );
        }
      }}
    >
      <Table.Root
        ref={tableRef}
        containerRef={containerRef}
        containerClassName="h-40"
        data-testid="table"
        style={{ tableLayout: "fixed", width: sizing.tableWidth, borderCollapse: "collapse" }}
      >
        <colgroup>
          {columns.map((column) => (
            <col
              key={column.id}
              data-column-id={column.id}
              style={{ width: sizing.widths.get(column.id) }}
            />
          ))}
          <col style={{ width: sizing.spacerWidth }} />
        </colgroup>
        <Table.Header>
          <Table.Row>
            {columns.map((column, index) => (
              <Table.Head key={column.id} data-testid={`head-${column.id}`} style={pinned(index)}>
                {column.id}
              </Table.Head>
            ))}
            <Table.Head data-testid="spacer" style={{ padding: 0 }} />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {start > 0 && (
            <Table.Row>
              <Table.Cell colSpan={columns.length + 1} style={{ height: start * 32, padding: 0 }} />
            </Table.Row>
          )}
          {Array.from({ length: count }, (_, offset) => {
            const row = start + offset;
            return (
              <Table.Row key={row} data-rendered-line={row} style={{ height: 32 }}>
                {columns.map((column, index) => (
                  <Table.Cell
                    key={column.id}
                    data-testid={`cell-${row}-${column.id}`}
                    style={{ ...pinned(index), paddingBlock: 0 }}
                  >
                    {content(column, row)}
                  </Table.Cell>
                ))}
                <Table.Cell style={{ padding: 0 }} />
              </Table.Row>
            );
          })}
          {windowed && start + count < total && (
            <Table.Row>
              <Table.Cell
                colSpan={columns.length + 1}
                style={{ height: (total - start - count) * 32, padding: 0 }}
              />
            </Table.Row>
          )}
          {nested && (
            <Table.Row>
              <Table.Cell colSpan={columns.length + 1}>
                <Input aria-label="Detail draft" defaultValue="detail" />
                <table>
                  <colgroup>
                    <col data-column-id="auto" style={{ width: 4000 }} />
                  </colgroup>
                  <tbody>
                    <tr>
                      <td>Nested detail content</td>
                    </tr>
                  </tbody>
                </table>
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
        <Table.Footer>
          <Table.Row>
            {columns.map((column, index) => (
              <Table.Cell key={column.id} data-testid={`foot-${column.id}`} style={pinned(index)}>
                {column.id === "auto" ? footer : ""}
              </Table.Cell>
            ))}
            <Table.Cell style={{ padding: 0 }} />
          </Table.Row>
        </Table.Footer>
      </Table.Root>
    </div>
  );
}

function widthOf(element: Element) {
  return element.getBoundingClientRect().width;
}
function scrollport(table: HTMLElement) {
  return table.parentElement!;
}

beforeEach(async () => {
  await document.fonts.ready;
});

describe("LineItems mixed column sizing with shipped Table/CSS", () => {
  it("keeps px and intrinsic auto distinct, shares flex equally, and scrolls rather than unpinning", async () => {
    const view = render(<Fixture />);
    const table = view.getByTestId("table");
    await expect.poll(() => widthOf(table)).toBeCloseTo(900, 0);
    expect(widthOf(view.getByTestId("head-fixed"))).toBeCloseTo(120.5, 1);
    const auto = widthOf(view.getByTestId("head-auto"));
    expect(auto).toBeGreaterThan(widthOf(view.getByTestId("label-0")));
    expect(widthOf(view.getByTestId("head-first"))).toBeCloseTo(
      widthOf(view.getByTestId("head-second")),
      1,
    );
    expect(widthOf(view.getByTestId("head-first"))).toBeGreaterThan(auto);
    view.rerender(<Fixture width={300} />);
    await expect.poll(() => scrollport(table).clientWidth).toBe(300);
    expect(widthOf(view.getByTestId("head-fixed"))).toBeCloseTo(120.5, 1);
    expect(widthOf(view.getByTestId("head-auto"))).toBeCloseTo(auto, 1);
    expect(widthOf(view.getByTestId("head-first"))).toBeGreaterThanOrEqual(119.99);
    expect(scrollport(table).scrollWidth).toBeGreaterThan(scrollport(table).clientWidth);
    for (const id of ["fixed", "auto", "second"])
      expect(getComputedStyle(view.getByTestId(`head-${id}`)).position).toBe("sticky");
    expect(parseFloat(getComputedStyle(view.getByTestId("head-auto")).left)).toBeCloseTo(120.5, 1);
  });

  it("absorbs unused space in a spacer without stretching px/auto, aligning header/body/footer", async () => {
    const columns = mixed.slice(0, 2);
    const view = render(<Fixture columns={columns} width={800} />);
    await expect.poll(() => widthOf(view.getByTestId("table"))).toBeCloseTo(800, 0);
    expect(widthOf(view.getByTestId("spacer"))).toBeGreaterThan(400);
    for (const column of columns) {
      const head = view.getByTestId(`head-${column.id}`).getBoundingClientRect();
      for (const prefix of ["cell-0", "foot"]) {
        const cell = view.getByTestId(`${prefix}-${column.id}`).getBoundingClientRect();
        expect(cell.width).toBeCloseTo(head.width, 1);
        expect(cell.left).toBeCloseTo(head.left, 1);
      }
    }
    expect(widthOf(view.getByTestId("head-fixed"))).toBeCloseTo(120.5, 1);
  });

  it("includes footer intrinsic content, caches growth, and ignores nested detail tables", async () => {
    const view = render(<Fixture />);
    const initial = widthOf(view.getByTestId("head-auto"));
    view.rerender(<Fixture nested />);
    expect(widthOf(view.getByTestId("head-auto"))).toBeCloseTo(initial, 1);
    view.rerender(<Fixture footer={longLabel} nested />);
    await expect.poll(() => widthOf(view.getByTestId("head-auto"))).toBeGreaterThan(initial + 100);
    const grown = widthOf(view.getByTestId("head-auto"));
    view.rerender(<Fixture footer="Short" />);
    expect(widthOf(view.getByTestId("head-auto"))).toBeCloseTo(grown, 1);
    view.rerender(<Fixture footer="Short" scope="another-document" />);
    await expect.poll(() => widthOf(view.getByTestId("head-auto"))).toBeCloseTo(initial, 1);
  });

  it("measures actual bounded scroll windows and does not shrink when long content unmounts", async () => {
    const view = render(<Fixture windowed />);
    const table = view.getByTestId("table");
    const container = scrollport(table);
    const initial = widthOf(view.getByTestId("head-auto"));
    container.scrollTop = 50 * 32 + 40;
    fireEvent.scroll(container);
    await expect.poll(() => table.querySelector('[data-rendered-line="50"]') !== null).toBe(true);
    await expect.poll(() => widthOf(view.getByTestId("head-auto"))).toBeGreaterThan(initial + 100);
    const grown = widthOf(view.getByTestId("head-auto"));
    expect(table.querySelectorAll("[data-rendered-line]").length).toBe(6);
    container.scrollTop = 0;
    fireEvent.scroll(container);
    await expect.poll(() => table.querySelector('[data-rendered-line="0"]') !== null).toBe(true);
    expect(table.querySelector('[data-rendered-line="50"]')).toBeNull();
    expect(widthOf(view.getByTestId("head-auto"))).toBeCloseTo(grown, 1);
  });

  it("does not remount editors or lose focus/drafts during intrinsic measurement and resizing", async () => {
    const view = render(<Fixture />);
    const input = view.getByRole("textbox", { name: "Draft" }) as HTMLInputElement;
    input.focus();
    fireEvent.change(input, { target: { value: "half-typed" } });
    view.rerender(<Fixture width={1100} footer={longLabel} />);
    await expect.poll(() => widthOf(view.getByTestId("table"))).toBeCloseTo(1100, 0);
    expect(view.getByRole("textbox", { name: "Draft" })).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe("half-typed");
  });

  it("preserves focus and draft inside a spanning detail cell during measurement", async () => {
    const view = render(<Fixture nested />);
    const input = view.getByRole("textbox", { name: "Detail draft" }) as HTMLInputElement;
    input.focus();
    fireEvent.change(input, { target: { value: "unfinished detail" } });
    view.rerender(<Fixture nested width={1100} footer={longLabel} />);
    await expect.poll(() => widthOf(view.getByTestId("table"))).toBeCloseTo(1100, 0);
    expect(view.getByRole("textbox", { name: "Detail draft" })).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe("unfinished detail");
  });

  it("recovers after a hidden mount and reacts to container resize", async () => {
    const view = render(<Fixture hidden />);
    expect(widthOf(view.getByTestId("table"))).toBe(0);
    view.rerender(<Fixture width={700} />);
    await expect.poll(() => widthOf(view.getByTestId("table"))).toBeCloseTo(700, 0);
    view.rerender(<Fixture width={1000} />);
    await expect.poll(() => widthOf(view.getByTestId("table"))).toBeCloseTo(1000, 0);
  });
});
