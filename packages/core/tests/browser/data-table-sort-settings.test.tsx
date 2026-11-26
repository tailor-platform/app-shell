import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataTable, useCollectionVariables, useDataTable } from "@tailor-platform/app-shell";
import { AppShell } from "@tailor-platform/app-shell/testing";
import { beforeEach, describe, expect, it } from "vitest";
import { applyPalette } from "./theme-utils";

const longLabel = "Customer display name with a very long column label";

function wrapper({ children }: { children: ReactNode }) {
  return (
    <AppShell memory modules={[]} locale="en">
      {children}
    </AppShell>
  );
}

function SortPage() {
  const { variables, control } = useCollectionVariables({
    params: {
      initialSort: [
        { field: "status", direction: "Desc" },
        { field: "name", direction: "Asc" },
      ],
    },
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
      <DataTable.SortSettings />
      <DataTable.Table />
      <output aria-label="Sort order">{JSON.stringify(variables.order)}</output>
    </DataTable.Root>
  );
}

function UnsortedPage() {
  const { control } = useCollectionVariables({ params: {} });
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
      <DataTable.SortSettings />
      <DataTable.Table />
    </DataTable.Root>
  );
}

// Testing Library's drag helpers clone DataTransfer without its stored data.
const dragEvent = (type: string, target: Element, dataTransfer: DataTransfer, clientY = 0) =>
  fireEvent(
    target,
    new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer, clientY }),
  );

const sortOrder = () => JSON.parse(screen.getByLabelText("Sort order").textContent!);

describe.each(["light", "dark"] as const)("DataTable.SortSettings / %s", (mode) => {
  beforeEach(() => applyPalette("default", mode));

  it("keeps long labels and controls inside the popup", async () => {
    const user = userEvent.setup();
    render(<SortPage />, { wrapper });
    await user.click(await screen.findByRole("button", { name: /^Sort/ }));
    const group = screen.getByRole("group", { name: "Sort settings" });
    const popup = group.closest<HTMLElement>('[data-slot="data-table-sort-settings-popup"]')!;
    const row = within(group).getByText(longLabel).closest("li")!;
    const select = within(row).getByRole("combobox", { name: `Sort direction for ${longLabel}` });
    const remove = within(row).getByRole("button", { name: `Remove sort for ${longLabel}` });

    await waitFor(() => {
      const bounds = popup.getBoundingClientRect();
      expect(bounds.width).toBeLessThanOrEqual(window.innerWidth);
      expect(popup.scrollWidth).toBeLessThanOrEqual(popup.clientWidth);
      expect(select.getBoundingClientRect().left).toBeGreaterThan(bounds.left);
      expect(select.getBoundingClientRect().right).toBeLessThan(
        remove.getBoundingClientRect().left,
      );
      expect(remove.getBoundingClientRect().right).toBeLessThanOrEqual(bounds.right);
    });
  });

  it("reorders priority with a real DataTransfer drag and updates aria-sort", async () => {
    const user = userEvent.setup();
    render(<SortPage />, { wrapper });
    expect(
      (await screen.findByRole("columnheader", { name: "Status" })).getAttribute("aria-sort"),
    ).toBe("descending");
    await user.click(screen.getByRole("button", { name: /^Sort/ }));
    const group = screen.getByRole("group", { name: "Sort settings" });
    const nameRow = within(group).getByText(longLabel).closest("li")!;
    const statusRow = within(group).getByText("Status").closest("li")!;

    const transfer = new DataTransfer();
    dragEvent("dragstart", nameRow, transfer);
    expect(transfer.getData("text/plain")).toBe("name");
    const target = statusRow.getBoundingClientRect();
    dragEvent("dragover", statusRow, transfer, target.top + target.height / 4);
    dragEvent("drop", statusRow, transfer);
    dragEvent("dragend", nameRow, transfer);

    expect(sortOrder()).toEqual([
      { field: "name", direction: "Asc" },
      { field: "status", direction: "Desc" },
    ]);
    expect(screen.getByRole("columnheader", { name: longLabel }).getAttribute("aria-sort")).toBe(
      "ascending",
    );
    expect(screen.getByRole("columnheader", { name: "Status" }).hasAttribute("aria-sort")).toBe(
      false,
    );
  });

  it("highlights the first search match and follows the pointer", async () => {
    const user = userEvent.setup();
    render(<UnsortedPage />, { wrapper });
    await user.click(await screen.findByRole("button", { name: /^Sort/ }));
    await user.click(screen.getByRole("button", { name: "Add sort" }));
    const highlighted = () =>
      screen.getAllByRole("option").find((el) => el.hasAttribute("data-highlighted"));

    await waitFor(() => expect(highlighted()?.textContent).toBe(longLabel));
    const status = screen.getByRole("option", { name: "Status" });
    await user.hover(status);
    await waitFor(() => expect(highlighted()).toBe(status));
    // The highlight is visible, not just an attribute.
    expect(getComputedStyle(status).backgroundColor).not.toBe(
      getComputedStyle(status.parentElement!).backgroundColor,
    );
  });
});
