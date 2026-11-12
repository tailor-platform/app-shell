import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  DataTable,
  SidebarLayout,
  defineModule,
  useCollectionVariables,
  useDataTable,
} from "@tailor-platform/app-shell";
import { AppShell } from "@tailor-platform/app-shell/testing";
import { beforeEach, describe, expect, it } from "vitest";
import { applyPalette } from "./theme-utils";

const longLabel = "Customer display name with a very long column label";

function SettingsPage() {
  const { variables, control } = useCollectionVariables({
    params: { initialSort: [{ field: "status", direction: "Desc" }] },
  });
  const table = useDataTable({
    columns: [
      { id: "name", label: longLabel, sort: { field: "name", type: "string" } },
      { id: "status", label: "Status", sort: { field: "status", type: "string" } },
    ],
    data: { rows: [{ id: "1", name: "Alex", status: "Active" }] },
    control,
    sort: { multiple: true },
  });
  return (
    <DataTable.Root value={table}>
      <DataTable.ColumnSettings />
      <DataTable.Table />
      <output aria-label="Sort order">{JSON.stringify(variables.order)}</output>
    </DataTable.Root>
  );
}

const modules = [
  defineModule({
    path: "settings",
    meta: { title: "Settings" },
    component: SettingsPage,
    resources: [],
  }),
];

const rowMetrics = (row: Element) => {
  const style = getComputedStyle(row);
  return { height: style.height, padding: style.padding, gap: style.gap };
};

const headingMetrics = (section: Element) => {
  const heading = section.firstElementChild!;
  const row = section.querySelector('[draggable="true"]')!;
  const bounds = section.getBoundingClientRect();
  const title = heading.getBoundingClientRect();
  return {
    padding: getComputedStyle(heading).padding,
    height: title.height,
    left: title.left - bounds.left,
    top: title.top - bounds.top,
    rowGap: row.getBoundingClientRect().top - title.bottom,
  };
};

// Testing Library's drag helpers clone DataTransfer without its stored data.
const dragEvent = (type: string, target: Element, dataTransfer: DataTransfer, clientY = 0) =>
  fireEvent(
    target,
    new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer, clientY }),
  );

describe.each(["light", "dark"] as const)("column sorting settings / %s", (mode) => {
  beforeEach(() => applyPalette("default", mode));

  it("keeps controls inside the popup and supports DataTransfer addition, reordering, direction toggle, and removal", async () => {
    const user = userEvent.setup();
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const expectedWidth = Math.min(400, window.innerWidth - 2 * rem);
    render(
      <AppShell memory initialEntries={["/settings"]} title="Test" modules={modules}>
        <SidebarLayout />
      </AppShell>,
    );
    await user.click(await screen.findByRole("button", { name: "Columns" }));
    const settings = screen.getByRole("group", { name: "Column settings" });
    await waitFor(() =>
      expect(
        settings
          .closest<HTMLElement>('[data-slot="data-table-column-settings-popup"]')!
          .getBoundingClientRect().width,
      ).toBeCloseTo(expectedWidth, 2),
    );
    const visibilityHeading = headingMetrics(
      settings.querySelector('[data-section="scrollable"]')!,
    );
    const visibilityRow = within(settings)
      .getByRole("button", { name: longLabel })
      .closest('[draggable="true"]')!;
    const expectedMetrics = rowMetrics(visibilityRow);
    await user.click(screen.getByRole("tab", { name: "Sorting" }));
    const active = screen.getByRole("group", { name: "Sorted columns" });
    const candidate = screen.getByRole("button", { name: `Sort by ${longLabel}` });
    const row = candidate.closest('[draggable="true"]')!;
    expect(rowMetrics(row)).toEqual(expectedMetrics);
    expect(headingMetrics(screen.getByRole("group", { name: "Available columns" }))).toEqual(
      visibilityHeading,
    );
    expect(headingMetrics(active)).toEqual(visibilityHeading);
    const dataTransfer = new DataTransfer();
    dragEvent("dragstart", row, dataTransfer);
    expect(dataTransfer.getData("text/plain")).toBe("name");
    dragEvent("dragover", active, dataTransfer);
    dragEvent("drop", active, dataTransfer);
    const direction = within(active).getByRole("button", {
      name: `${longLabel}: Ascending. Toggle sort direction`,
    });
    const remove = within(active).getByRole("button", { name: `Remove sort for ${longLabel}` });
    const activeRow = direction.closest('[draggable="true"]')!;
    expect(rowMetrics(activeRow)).toEqual(expectedMetrics);
    const grip = within(activeRow as HTMLElement).getByRole("button", {
      name: /^Reorder sort for /,
    });
    const popup = active.closest<HTMLElement>('[data-slot="data-table-column-settings-popup"]')!;
    await waitFor(() => {
      const bounds = popup.getBoundingClientRect();
      expect(bounds.width).toBeCloseTo(expectedWidth, 2);
      expect(popup.scrollWidth).toBeLessThanOrEqual(popup.clientWidth);
      expect(grip.getBoundingClientRect().left).toBeGreaterThanOrEqual(bounds.left);
      expect(grip.getBoundingClientRect().right).toBeLessThan(
        direction.getBoundingClientRect().left,
      );
      expect(direction.getBoundingClientRect().right).toBeLessThanOrEqual(bounds.right);
      expect(remove.getBoundingClientRect().right).toBeLessThanOrEqual(bounds.right);
      expect(direction.getBoundingClientRect().left).toBeLessThan(
        remove.getBoundingClientRect().left,
      );
    });
    const statusRow = within(active).getByText("Status").closest('[draggable="true"]')!;
    const reorderTransfer = new DataTransfer();
    dragEvent("dragstart", activeRow, reorderTransfer);
    expect(reorderTransfer.getData("text/plain")).toBe("name");
    const targetBounds = statusRow.getBoundingClientRect();
    dragEvent("dragover", statusRow, reorderTransfer, targetBounds.top + targetBounds.height / 4);
    dragEvent("drop", statusRow, reorderTransfer);
    dragEvent("dragend", activeRow, reorderTransfer);
    expect(JSON.parse(screen.getByLabelText("Sort order").textContent!)).toEqual([
      { field: "name", direction: "Asc" },
      { field: "status", direction: "Desc" },
    ]);
    expect(screen.getByRole("columnheader", { name: longLabel }).getAttribute("aria-sort")).toBe(
      "ascending",
    );
    expect(screen.getByRole("columnheader", { name: "Status" }).hasAttribute("aria-sort")).toBe(
      false,
    );

    await user.click(direction);
    expect(JSON.parse(screen.getByLabelText("Sort order").textContent!)).toEqual([
      { field: "name", direction: "Desc" },
      { field: "status", direction: "Desc" },
    ]);
    await user.click(remove);
    expect(JSON.parse(screen.getByLabelText("Sort order").textContent!)).toEqual([
      { field: "status", direction: "Desc" },
    ]);
    const returnedCandidate = screen.getByRole("button", { name: `Sort by ${longLabel}` });
    const insertionRow = returnedCandidate.closest('[draggable="true"]')!;
    const insertionTransfer = new DataTransfer();
    dragEvent("dragstart", insertionRow, insertionTransfer);
    expect(insertionTransfer.getData("text/plain")).toBe("name");
    const statusBounds = statusRow.getBoundingClientRect();
    dragEvent("dragover", statusRow, insertionTransfer, statusBounds.top + statusBounds.height / 4);
    dragEvent("drop", statusRow, insertionTransfer);
    dragEvent("dragend", insertionRow, insertionTransfer);
    expect(JSON.parse(screen.getByLabelText("Sort order").textContent!)).toEqual([
      { field: "name", direction: "Asc" },
      { field: "status", direction: "Desc" },
    ]);
    expect(screen.getByRole("columnheader", { name: longLabel }).getAttribute("aria-sort")).toBe(
      "ascending",
    );

    const available = screen.getByRole("group", { name: "Available columns" });
    const search = screen.getByRole("searchbox", { name: "Search columns" });
    await user.type(search, "missing");
    expect(within(available).getByText("No columns match")).toBeTruthy();
    const removeRow = within(active).getByText(longLabel).closest('[draggable="true"]')!;
    const removalTransfer = new DataTransfer();
    dragEvent("dragstart", removeRow, removalTransfer);
    expect(removalTransfer.getData("text/plain")).toBe("name");
    dragEvent("dragover", available, removalTransfer);
    dragEvent("drop", available, removalTransfer);
    dragEvent("dragend", removeRow, removalTransfer);
    expect(JSON.parse(screen.getByLabelText("Sort order").textContent!)).toEqual([
      { field: "status", direction: "Desc" },
    ]);
    expect(document.activeElement).toBe(available);
    expect(screen.getByRole("columnheader", { name: "Status" }).getAttribute("aria-sort")).toBe(
      "descending",
    );
    await user.clear(search);
    expect(within(available).getByRole("button", { name: `Sort by ${longLabel}` })).toBeTruthy();
  });
});
