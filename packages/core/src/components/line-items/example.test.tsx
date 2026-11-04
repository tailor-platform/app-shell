import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAppShellWrapper } from "../../../tests/test-utils";
import LineItemsExample from "../../../../../examples/vite-app/src/pages/showcase/line-items-next/page";

// Run the actual public-import example against the source entrypoint, without rebuilding dist.
vi.mock("@tailor-platform/app-shell", () => import("@/index"));

afterEach(cleanup);
function changes() {
  return JSON.parse(screen.getByTestId("current-change-set").textContent!);
}
const selected = (sku: string) =>
  within(screen.getByText(sku).closest("tr")!).getByRole("checkbox", { name: /Select line/ });
const deleteButton = () =>
  within(screen.getByRole("toolbar", { name: "Bulk actions" })).getByRole("button", {
    name: "Delete selected",
  });
function search(query: string) {
  fireEvent.change(screen.getByRole("textbox", { name: "Search line items" }), {
    target: { value: query },
  });
}

describe("LineItems showcase bulk deletion", () => {
  it.each([
    ["Product name", "", "Enter a product name."],
    ["Qty", "0", "Quantity must be greater than zero."],
    ["Unit price", "-1", "Unit price must be zero or greater."],
    ["Received qty", "-1", "Received quantity must be zero or greater."],
  ])(
    "rejects %s at the cell boundary, without adopting it for document validation",
    (label, value, message) => {
      render(<LineItemsExample />, { wrapper: createAppShellWrapper("en") });
      const input = screen.getByRole("textbox", { name: `${label}, line 1` });
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value } });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(input.getAttribute("aria-invalid")).toBe("true");
      expect(screen.getAllByText(message).length).toBeGreaterThan(0);
      expect(changes().isEmpty).toBe(true);
      expect(screen.queryByText(/^Errors:/)).toBeNull();
    },
  );
  it("shows application-owned document errors after asynchronous validation", async () => {
    render(<LineItemsExample />, { wrapper: createAppShellWrapper("en") });
    await userEvent.click(screen.getByRole("checkbox", { name: "Select all visible lines" }));
    await userEvent.click(deleteButton());
    await userEvent.click(screen.getByRole("button", { name: "Start save" }));
    expect(await screen.findByText("Add at least one line before saving.")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Apply save response" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(screen.queryByText("Add at least one line before saving.")).toBeNull();
  });

  it("places tools above the table, actions in the footer, and enables saving unfinished drafts without status badges", async () => {
    render(<LineItemsExample />, { wrapper: createAppShellWrapper("en") });
    const table = screen.getByRole("table", { name: "Purchase order lines" });
    const frame = table.closest('[data-slot="line-items"]')!;
    expect(frame.className).toContain("astw:border");
    expect(frame.className).toContain("astw:rounded-md");
    expect(table.closest('[data-slot="card"]')).toBeNull();
    expect(frame.querySelector('[data-slot="line-items-footer"]')).not.toBeNull();
    const tools = screen.getByRole("toolbar", { name: "Line item tools" });
    const toolGroups = tools.querySelectorAll<HTMLElement>('[data-slot="toolbar-group"]');
    expect(
      within(toolGroups[0]!).getByRole("textbox", { name: "Search line items" }),
    ).toBeDefined();
    expect(within(toolGroups[1]!).getByRole("button", { name: "Columns" })).toBeDefined();
    expect(within(tools).queryByRole("button", { name: "Add line" })).toBeNull();
    const footer = screen.getByRole("toolbar", { name: "Line item document actions" });
    const groups = footer.querySelectorAll<HTMLElement>('[data-slot="toolbar-group"]');
    expect(within(groups[0]!).getByRole("button", { name: "Add line" })).toBeDefined();
    const save = within(groups[1]!).getByRole("button", {
      name: "Start save",
    }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    for (const label of ["Unsaved changes", "No changes", "Awaiting save response"]) {
      expect(screen.queryByText(label)).toBeNull();
    }
    const quantity = screen.getByRole("textbox", { name: "Qty, line 1" });
    fireEvent.focus(quantity);
    fireEvent.change(quantity, { target: { value: "13" } });
    expect(changes().isEmpty).toBe(true);
    expect(save.disabled).toBe(false);
    await userEvent.click(save);
    const acknowledge = await screen.findByRole("button", { name: "Apply save response" });
    expect((acknowledge as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByText("Awaiting save response")).toBeNull();
    await userEvent.click(acknowledge);
    expect((screen.getByRole("button", { name: "Start save" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("keeps acknowledgment available after Discard clears local changes during a pending save", async () => {
    render(<LineItemsExample />, { wrapper: createAppShellWrapper("en") });
    await userEvent.click(screen.getByRole("button", { name: "Add line" }));
    await userEvent.click(screen.getByRole("button", { name: "Start save" }));
    await screen.findByRole("button", { name: "Apply save response" });
    await userEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(changes().isEmpty).toBe(true);
    const acknowledge = screen.getByRole("button", { name: "Apply save response" });
    expect((acknowledge as HTMLButtonElement).disabled).toBe(false);
    await userEvent.click(acknowledge);
    expect(changes().lineChanges).toEqual([{ action: "remove", lineId: "saved-1" }]);
  });

  it("switches the footer's left side to a DataTable-style selection bar and returns focus on Clear", async () => {
    render(<LineItemsExample />, { wrapper: createAppShellWrapper("en") });
    await userEvent.click(selected("SKU-4100"));
    const bar = screen.getByRole("toolbar", { name: "Bulk actions" });
    expect(within(bar).getByText("1 of 5 selected")).toBeDefined();
    expect(deleteButton()).toBeDefined();
    expect(screen.queryByRole("button", { name: "Add line" })).toBeNull();
    expect((screen.getByRole("button", { name: "Start save" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(changes().isEmpty).toBe(true);
    const header = screen.getByRole("checkbox", { name: "Select all visible lines" });
    await userEvent.click(within(bar).getByRole("button", { name: "Clear selection" }));
    expect(document.activeElement).toBe(header);
    expect(screen.queryByRole("toolbar", { name: "Bulk actions" })).toBeNull();
    expect(screen.getByRole("button", { name: "Add line" })).toBeDefined();
    expect(changes().isEmpty).toBe(true);
  });

  it("returns focus to Add line when bulk deletion empties the document", async () => {
    render(<LineItemsExample />, { wrapper: createAppShellWrapper("en") });
    await userEvent.click(screen.getByRole("checkbox", { name: "Select all visible lines" }));
    expect(
      within(screen.getByRole("toolbar", { name: "Bulk actions" })).getByText("5 of 5 selected"),
    ).toBeDefined();
    await userEvent.click(deleteButton());
    expect(changes().lineChanges).toHaveLength(5);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Add line" }));
    expect(screen.getByText("0 items")).toBeDefined();
    expect((screen.getByRole("button", { name: "Start save" }) as HTMLButtonElement).disabled).toBe(
      false,
    );
    await userEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(screen.getByText("5 items")).toBeDefined();
    expect((screen.getByRole("button", { name: "Start save" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("keeps selection out of dirty state, retains it during edits, and removes selected rows in one change set", async () => {
    render(<LineItemsExample />, { wrapper: createAppShellWrapper("en") });
    await userEvent.click(selected("SKU-4100"));
    expect(changes().isEmpty).toBe(true);
    const quantity = screen.getByRole("textbox", { name: "Qty, line 1" });
    fireEvent.focus(quantity);
    fireEvent.change(quantity, { target: { value: "13" } });
    fireEvent.keyDown(quantity, { key: "Enter" });
    expect(selected("SKU-4100").getAttribute("aria-checked")).toBe("true");
    await userEvent.click(selected("SKU-4114"));
    await userEvent.click(deleteButton());
    expect(changes().lineChanges).toEqual([
      { action: "remove", lineId: "line-1" },
      { action: "remove", lineId: "line-3" },
    ]);
    expect(screen.getByText("3 items")).toBeDefined();
    expect(screen.queryByText("SKU-4100")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(screen.getByText("5 items")).toBeDefined();
    expect(changes().isEmpty).toBe(true);
    expect(screen.queryByRole("button", { name: "Delete selected" })).toBeNull();
    expect(selected("SKU-4100").getAttribute("aria-checked")).toBe("false");
  });

  it("selects only visible matches and deletes hidden selections too", async () => {
    render(<LineItemsExample />, { wrapper: createAppShellWrapper("en") });
    await userEvent.click(selected("SKU-4100"));
    search("gasket");
    await userEvent.click(screen.getByRole("checkbox", { name: "Select all visible lines" }));
    expect(
      within(screen.getByRole("toolbar", { name: "Bulk actions" })).getByText("2 of 5 selected"),
    ).toBeDefined();
    expect(selected("SKU-4121").getAttribute("aria-checked")).toBe("true");
    search("");
    expect(
      screen
        .getByRole("checkbox", { name: "Select all visible lines" })
        .getAttribute("aria-checked"),
    ).toBe("mixed");
    expect(selected("SKU-4107").getAttribute("aria-checked")).toBe("false");
    search("spacer");
    await userEvent.click(deleteButton());
    expect(changes().lineChanges).toEqual([
      { action: "remove", lineId: "line-1" },
      { action: "remove", lineId: "line-4" },
    ]);
    expect(screen.getByText("3 items")).toBeDefined();
    expect(
      (screen.getByRole("textbox", { name: "Search line items" }) as HTMLInputElement).value,
    ).toBe("spacer");
    expect(selected("SKU-4138")).toBeDefined();
  });

  it("cancels an unsaved creation and clears selection on save acknowledgment", async () => {
    render(<LineItemsExample />, { wrapper: createAppShellWrapper("en") });
    await userEvent.click(screen.getByRole("button", { name: "Add line" }));
    await userEvent.click(selected("NEW-001"));
    await userEvent.click(deleteButton());
    expect(changes().isEmpty).toBe(true);
    expect(screen.getByText("5 items")).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: "Add line" }));
    await userEvent.click(selected("NEW-002"));
    await userEvent.click(screen.getByRole("button", { name: "Start save" }));
    await userEvent.click(await screen.findByRole("button", { name: "Apply save response" }));
    expect(changes().isEmpty).toBe(true);
    expect(selected("NEW-002").getAttribute("aria-checked")).toBe("false");
    expect(screen.queryByRole("button", { name: "Delete selected" })).toBeNull();
  });

  it("uses the standard row handles instead of custom up/down actions", () => {
    render(<LineItemsExample />, { wrapper: createAppShellWrapper("en") });
    expect(screen.getAllByRole("button", { name: /Reorder line/ })).toHaveLength(5);
    expect(screen.queryAllByRole("button", { name: /Move SKU/ })).toHaveLength(0);
  });
});
