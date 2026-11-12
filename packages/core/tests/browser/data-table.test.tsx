import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataTable, Text, Toolbar, useDataTable } from "@tailor-platform/app-shell";
import { AppShell } from "@tailor-platform/app-shell/testing";
import { describe, expect, it, vi } from "vitest";

type Row = { id: string; name: string };

function wrapper({ children }: { children: ReactNode }) {
  return (
    <AppShell memory modules={[]} locale="en">
      {children}
    </AppShell>
  );
}

function TestTable({
  height = "fixed",
  rows = [],
  loading = false,
  error = null,
  columnFooter = false,
  wide = false,
  emptyContent = <span data-testid="empty-content">No requests awaiting approval</span>,
  errorContent = <span data-testid="error-content">Unable to load requests</span>,
}: {
  height?: "natural" | "fixed" | "flex";
  rows?: Row[];
  loading?: boolean;
  error?: Error | null;
  columnFooter?: boolean;
  wide?: boolean;
  emptyContent?: ReactNode;
  errorContent?: ReactNode;
}) {
  const table = useDataTable<Row>({
    columns: [
      { id: "name", label: "Name", type: "text", footer: columnFooter ? "Total" : undefined },
      ...(wide
        ? Array.from({ length: 12 }, (_, index) => ({
            id: `extra-${index}`,
            label: `Additional column ${index + 1}`,
            width: 240,
            render: () => "Additional value",
          }))
        : []),
    ],
    data: { rows },
    loading,
    error,
  });
  return (
    <div
      style={
        height === "flex" ? { display: "flex", flexDirection: "column", height: 400 } : undefined
      }
    >
      <DataTable.Root
        value={table}
        className={{ natural: undefined, fixed: "h-[400px]", flex: "flex-1" }[height]}
      >
        <Toolbar.Root>
          <Toolbar.Row aria-label="Table controls">
            <Text.span>Requests</Text.span>
          </Toolbar.Row>
        </Toolbar.Root>
        <DataTable.Table emptyContent={emptyContent} errorContent={errorContent} />
        <DataTable.Footer>
          <Text.span>Table footer</Text.span>
        </DataTable.Footer>
      </DataTable.Root>
    </div>
  );
}

function WideStatus({ onAction }: { onAction: () => void }) {
  return (
    <div style={{ width: 1200, display: "flex", justifyContent: "space-between" }}>
      <button type="button">First status action</button>
      <button type="button" onClick={onAction}>
        Last status action
      </button>
    </div>
  );
}

const element = (selector: string) => document.querySelector<HTMLElement>(selector)!;
const root = () => element('[data-slot="data-table"]');
const scrollContainer = () => element('[data-slot="table-container"]');
const body = () => element("tbody");
const footer = () => element('[data-slot="data-table-footer"]');
const rect = (el: Element) => el.getBoundingClientRect();

// Exercise the published CSS in a real browser: a DOM-only test cannot measure table layout.
describe.each(["empty", "error"] as const)("DataTable %s layout", (state) => {
  const error = state === "error" ? new Error("Network error") : null;

  it.each(["fixed", "flex"] as const)(
    "fills the body of a %s-height table without growing its header",
    async (height) => {
      render(<TestTable height={height} error={error} />, { wrapper });

      await waitFor(() => {
        expect(rect(root()).height).toBe(400);
        expect(rect(body()).height).toBeGreaterThan(250);
        expect(rect(body()).bottom).toBeCloseTo(rect(footer()).top, 0);
        expect(rect(footer()).bottom).toBeCloseTo(rect(root()).bottom - 1, 0);
        expect(rect(element("thead")).height).toBe(40);
        const content = rect(screen.getByTestId(`${state}-content`));
        const status = rect(body());
        expect(
          Math.abs(content.top + content.height / 2 - (status.top + status.height / 2)),
        ).toBeLessThan(4);
        expect(scrollContainer().scrollHeight).toBe(scrollContainer().clientHeight);
      });
    },
  );

  it("keeps status content centered in the viewport while scrolling and resizing a wide table", async () => {
    const { rerender } = render(
      <div style={{ width: 600 }}>
        <TestTable wide error={error} />
      </div>,
      { wrapper },
    );
    await screen.findByText("Table footer");
    const container = scrollContainer();
    const expectCentered = () => {
      const viewport = rect(container);
      const content = rect(screen.getByTestId(`${state}-content`));
      expect(content.left).toBeGreaterThanOrEqual(viewport.left);
      expect(content.right).toBeLessThanOrEqual(viewport.left + container.clientWidth);
      expect(
        Math.abs(content.left + content.width / 2 - (viewport.left + container.clientWidth / 2)),
      ).toBeLessThan(4);
    };
    await waitFor(() => {
      expect(container.scrollWidth).toBeGreaterThan(container.clientWidth * 2);
      expectCentered();
    });
    expect(element("tbody td").getAttribute("colspan")).toBe("13");

    for (const fraction of [0.5, 1]) {
      container.scrollLeft = (container.scrollWidth - container.clientWidth) * fraction;
      fireEvent.scroll(container);
      await waitFor(expectCentered);
    }

    rerender(
      <div style={{ width: 360 }}>
        <TestTable wide error={error} />
      </div>,
    );
    await waitFor(() => {
      expect(container.clientWidth).toBe(358);
      expectCentered();
    });
    container.scrollLeft = 0;
    fireEvent.scroll(container);
    await waitFor(expectCentered);
  });

  it("scrolls oversized custom content independently of the columns to reach its last action", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const content = <WideStatus onAction={onAction} />;
    render(
      <div style={{ width: 600 }}>
        <TestTable wide error={error} emptyContent={content} errorContent={content} />
      </div>,
      { wrapper },
    );
    const action = await screen.findByRole("button", { name: "Last status action" });
    const container = scrollContainer();
    const status = element('[data-slot="data-table-status-content"]');
    await waitFor(() => {
      expect(container.scrollWidth).toBeGreaterThan(container.clientWidth * 2);
      expect(status.scrollWidth).toBeGreaterThan(status.clientWidth);
      expect(rect(action).left).toBeGreaterThan(rect(status).right);
    });

    container.scrollLeft = (container.scrollWidth - container.clientWidth) / 2;
    fireEvent.scroll(container);
    const columnScroll = container.scrollLeft;
    status.scrollLeft = status.scrollWidth - status.clientWidth;
    fireEvent.scroll(status);
    await waitFor(() => {
      expect(status.scrollLeft).toBeGreaterThan(0);
      expect(rect(action).left).toBeGreaterThanOrEqual(rect(status).left);
      expect(rect(action).right).toBeLessThanOrEqual(rect(status).right);
      expect(container.scrollLeft).toBe(columnScroll);
    });

    await user.click(action);
    expect(onAction).toHaveBeenCalledOnce();
  });

  it("reveals and activates an off-screen custom action using the keyboard", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const content = <WideStatus onAction={onAction} />;
    render(
      <div style={{ width: 600 }}>
        <TestTable wide error={error} emptyContent={content} errorContent={content} />
      </div>,
      { wrapper },
    );
    const first = await screen.findByRole("button", { name: "First status action" });
    const last = screen.getByRole("button", { name: "Last status action" });
    const status = element('[data-slot="data-table-status-content"]');
    await waitFor(() => {
      expect(status.scrollLeft).toBe(0);
      expect(rect(last).left).toBeGreaterThan(rect(status).right);
    });

    await user.click(first);
    await user.tab();
    await waitFor(() => {
      expect(document.activeElement).toBe(last);
      expect(status.scrollLeft).toBeGreaterThan(0);
      expect(rect(last).left).toBeGreaterThanOrEqual(rect(status).left);
      expect(rect(last).right).toBeLessThanOrEqual(rect(status).right);
      expect(scrollContainer().scrollLeft).toBe(0);
    });
    await user.keyboard("{Enter}");
    expect(onAction).toHaveBeenCalledOnce();
  });

  it("keeps the existing three-row minimum when height is not constrained", async () => {
    render(<TestTable height="natural" error={error} />, { wrapper });
    await screen.findByText("Table footer");

    expect(rect(body()).height).toBe(159);
    expect(rect(element("thead")).height).toBe(40);
    expect(rect(root()).height).toBeLessThan(400);
  });

  it("preserves column-footer visibility and keeps the table footer at its natural height", async () => {
    render(<TestTable columnFooter error={error} />, { wrapper });
    await screen.findByText("Table footer");

    const columnFooter = element("tfoot");
    expect(rect(body()).height).toBeGreaterThan(200);
    if (error) {
      expect(columnFooter).toBeNull();
      expect(rect(body()).bottom).toBeCloseTo(rect(footer()).top, 0);
    } else {
      expect(rect(body()).bottom).toBeCloseTo(rect(columnFooter).top, 0);
      expect(rect(columnFooter).height).toBeLessThan(60);
      expect(rect(columnFooter).bottom).toBeCloseTo(rect(footer()).top, 0);
    }
    expect(rect(footer()).bottom).toBeCloseTo(rect(root()).bottom - 1, 0);
  });

  it("scrolls tall custom content without pushing the table footer out of its frame", async () => {
    const content = <div style={{ height: 600 }}>Tall status content</div>;
    render(<TestTable error={error} emptyContent={content} errorContent={content} />, { wrapper });
    await screen.findByText("Table footer");

    expect(scrollContainer().scrollHeight).toBeGreaterThan(scrollContainer().clientHeight);
    expect(rect(footer()).bottom).toBeCloseTo(rect(root()).bottom - 1, 0);
    expect(rect(root()).height).toBe(400);
  });

  it("only stretches status rows when switching between data, status, and loading", async () => {
    const rows = [{ id: "1", name: "Alice" }];
    const { rerender } = render(<TestTable rows={rows} />, { wrapper });
    await screen.findByText("Table footer");
    const dataHeight = rect(body()).height;
    const headerHeight = rect(element("thead")).height;
    expect(dataHeight).toBeLessThan(100);

    rerender(<TestTable error={error} rows={state === "error" ? rows : []} />);
    expect(rect(body()).height).toBeGreaterThan(250);
    expect(rect(element("thead")).height).toBe(headerHeight);

    rerender(<TestTable loading error={error} />);
    const skeleton = element('[data-datatable-state="loading"]');
    expect(rect(skeleton).height).toBeLessThan(100);
    expect(screen.queryByTestId(`${state}-content`)).toBeNull();

    rerender(<TestTable rows={rows} />);
    expect(rect(body()).height).toBe(dataHeight);
    expect(rect(element("thead")).height).toBe(headerHeight);
  });
});
