import { afterEach, beforeEach, describe, it, expect } from "vitest";
import { cleanup, render, screen, fireEvent, within } from "@testing-library/react";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { DataTable } from "./data-table";
import { useDataTable } from "./use-data-table";
import type { Column, DataTableData } from "./types";

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  localStorage.clear();
});

type Row = { id: string; a: string; b: string; c: string };

const columns: Column<Row>[] = [
  { id: "a", label: "Alpha", width: 100, render: (r) => r.a },
  { id: "b", label: "Bravo", width: 100, render: (r) => r.b },
  { id: "c", label: "Charlie", width: 100, render: (r) => r.c },
];

const data: DataTableData<Row> = { rows: [{ id: "1", a: "a1", b: "b1", c: "c1" }] };

const wrapper = createAppShellWrapper("en");

function SettingsHarness() {
  const table = useDataTable<Row>({ columns, data });
  return (
    <DataTable.Root value={table}>
      <DataTable.Toolbar columnSettings />
      <DataTable.Table />
    </DataTable.Root>
  );
}

const headerLabels = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[data-slot="data-table-header"] th'))
    .map((th) => th.textContent?.trim())
    .filter(Boolean);

describe("DataTable.Toolbar columnSettings", () => {
  it("renders the Columns button only when the columnSettings prop is set", () => {
    function Bare() {
      const table = useDataTable<Row>({ columns, data });
      return (
        <DataTable.Root value={table}>
          <DataTable.Toolbar />
          <DataTable.Table />
        </DataTable.Root>
      );
    }
    render(<Bare />, { wrapper });
    expect(screen.queryByRole("button", { name: /columns/i })).toBeNull();

    cleanup();
    render(<SettingsHarness />, { wrapper });
    expect(screen.getByRole("button", { name: /columns/i })).toBeTruthy();
  });

  it("renders a checkbox per column and toggling hides it from the header", () => {
    const { container } = render(<SettingsHarness />, { wrapper });
    fireEvent.click(screen.getByRole("button", { name: /columns/i }));

    const panel = document.querySelector<HTMLElement>(
      '[data-slot="data-table-column-settings-popup"]',
    )!;
    expect(panel).toBeTruthy();

    // Uncheck "Bravo".
    const bravoCheckbox = within(panel).getByRole("checkbox", { name: "Bravo" });
    fireEvent.click(bravoCheckbox);

    expect(headerLabels(container)).toEqual(["Alpha", "Charlie"]);
  });

  it("renders the three drop-zone sections", () => {
    render(<SettingsHarness />, { wrapper });
    fireEvent.click(screen.getByRole("button", { name: /columns/i }));

    const panel = document.querySelector<HTMLElement>(
      '[data-slot="data-table-column-settings-popup"]',
    )!;
    expect(panel.querySelector('[data-section="left"]')).toBeTruthy();
    expect(panel.querySelector('[data-section="scrollable"]')).toBeTruthy();
    expect(panel.querySelector('[data-section="right"]')).toBeTruthy();
  });

  it("dragging a column into the Fixed right section pins it right", () => {
    const { container } = render(<SettingsHarness />, { wrapper });
    fireEvent.click(screen.getByRole("button", { name: /columns/i }));

    const panel = document.querySelector<HTMLElement>(
      '[data-slot="data-table-column-settings-popup"]',
    )!;
    const charlieRow = within(panel).getByText("Charlie").closest('[draggable="true"]')!;
    const rightZone = panel.querySelector<HTMLElement>('[data-section="right"]')!;

    fireEvent.dragStart(charlieRow);
    fireEvent.dragOver(rightZone);
    fireEvent.drop(rightZone);

    const charlieHead = Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot="data-table-header"] th'),
    ).find((th) => th.textContent?.trim() === "Charlie");
    expect(charlieHead?.style.position).toBe("sticky");
    expect(charlieHead?.style.right).toBe("0px");
  });

  it("dragging a column into Scrollable unpins a column pinned by default", () => {
    // "Alpha" is pinned left by default; dragging it to Scrollable must stick.
    const pinnedColumns: Column<Row>[] = columns.map((c) =>
      c.id === "a" ? { ...c, pin: "left" as const } : c,
    );
    function Harness() {
      const table = useDataTable<Row>({ columns: pinnedColumns, data });
      return (
        <DataTable.Root value={table}>
          <DataTable.Toolbar columnSettings />
          <DataTable.Table />
        </DataTable.Root>
      );
    }
    const { container } = render(<Harness />, { wrapper });
    fireEvent.click(screen.getByRole("button", { name: /columns/i }));

    const panel = document.querySelector<HTMLElement>(
      '[data-slot="data-table-column-settings-popup"]',
    )!;
    const alphaRow = within(panel).getByText("Alpha").closest('[draggable="true"]')!;
    const scrollableZone = panel.querySelector<HTMLElement>('[data-section="scrollable"]')!;

    fireEvent.dragStart(alphaRow);
    fireEvent.dragOver(scrollableZone);
    fireEvent.drop(scrollableZone);

    const alphaHead = Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot="data-table-header"] th'),
    ).find((th) => th.textContent?.trim() === "Alpha");
    expect(alphaHead?.style.position).toBe("");
  });

  it("search filters visible columns and shows an empty state for no matches", () => {
    render(<SettingsHarness />, { wrapper });
    fireEvent.click(screen.getByRole("button", { name: /columns/i }));

    const panel = document.querySelector<HTMLElement>(
      '[data-slot="data-table-column-settings-popup"]',
    )!;
    const search = within(panel).getByPlaceholderText("Search columns");

    fireEvent.change(search, { target: { value: "brav" } });
    expect(within(panel).getByText("Bravo")).toBeTruthy();
    expect(within(panel).queryByText("Alpha")).toBeNull();
    expect(within(panel).queryByText("Charlie")).toBeNull();

    fireEvent.change(search, { target: { value: "zzz" } });
    expect(within(panel).getByText(/no columns match/i)).toBeTruthy();

    // Clearing the query restores every column.
    fireEvent.change(search, { target: { value: "" } });
    expect(within(panel).getByText("Alpha")).toBeTruthy();
    expect(within(panel).getByText("Bravo")).toBeTruthy();
    expect(within(panel).getByText("Charlie")).toBeTruthy();
  });

  it("search filters only the Scrollable list — pinned zones stay in full", () => {
    // "Alpha" is pinned left; the search must never hide it.
    const pinnedColumns: Column<Row>[] = columns.map((c) =>
      c.id === "a" ? { ...c, pin: "left" as const } : c,
    );
    function Harness() {
      const table = useDataTable<Row>({ columns: pinnedColumns, data });
      return (
        <DataTable.Root value={table}>
          <DataTable.Toolbar columnSettings />
          <DataTable.Table />
        </DataTable.Root>
      );
    }
    render(<Harness />, { wrapper });
    fireEvent.click(screen.getByRole("button", { name: /columns/i }));

    const panel = document.querySelector<HTMLElement>(
      '[data-slot="data-table-column-settings-popup"]',
    )!;
    const search = within(panel).getByPlaceholderText("Search columns");
    fireEvent.change(search, { target: { value: "brav" } });

    const left = panel.querySelector<HTMLElement>('[data-section="left"]')!;
    const scrollable = panel.querySelector<HTMLElement>('[data-section="scrollable"]')!;
    // Pinned-left zone is unaffected by the query.
    expect(within(left).getByText("Alpha")).toBeTruthy();
    // Scrollable zone is filtered to the match.
    expect(within(scrollable).getByText("Bravo")).toBeTruthy();
    expect(within(scrollable).queryByText("Charlie")).toBeNull();
  });

  it("keeps rows draggable while searching", () => {
    render(<SettingsHarness />, { wrapper });
    fireEvent.click(screen.getByRole("button", { name: /columns/i }));

    const panel = document.querySelector<HTMLElement>(
      '[data-slot="data-table-column-settings-popup"]',
    )!;
    const search = within(panel).getByPlaceholderText("Search columns");
    fireEvent.change(search, { target: { value: "brav" } });

    const bravoRow = within(panel).getByText("Bravo").closest('[draggable="true"]');
    expect(bravoRow).not.toBeNull();
  });

  it("dragging a filtered row into a pinned zone still works while searching", () => {
    const { container } = render(<SettingsHarness />, { wrapper });
    fireEvent.click(screen.getByRole("button", { name: /columns/i }));

    const panel = document.querySelector<HTMLElement>(
      '[data-slot="data-table-column-settings-popup"]',
    )!;
    // Filter the Scrollable list down to just "Charlie", then drag it left.
    const search = within(panel).getByPlaceholderText("Search columns");
    fireEvent.change(search, { target: { value: "charl" } });

    const charlieRow = within(panel).getByText("Charlie").closest('[draggable="true"]')!;
    const leftZone = panel.querySelector<HTMLElement>('[data-section="left"]')!;
    fireEvent.dragStart(charlieRow);
    fireEvent.dragOver(leftZone);
    fireEvent.drop(leftZone);

    const charlieHead = Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot="data-table-header"] th'),
    ).find((th) => th.textContent?.trim() === "Charlie");
    expect(charlieHead?.style.position).toBe("sticky");
    expect(charlieHead?.style.left).toBe("0px");
  });

  it("show all / hide all toggle every column", () => {
    const { container } = render(<SettingsHarness />, { wrapper });
    fireEvent.click(screen.getByRole("button", { name: /columns/i }));

    const panel = document.querySelector<HTMLElement>(
      '[data-slot="data-table-column-settings-popup"]',
    )!;
    fireEvent.click(within(panel).getByRole("button", { name: /hide all/i }));
    expect(headerLabels(container)).toEqual([]);

    fireEvent.click(within(panel).getByRole("button", { name: /show all/i }));
    expect(headerLabels(container)).toEqual(["Alpha", "Bravo", "Charlie"]);
  });
});
