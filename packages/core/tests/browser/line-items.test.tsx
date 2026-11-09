import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataTable, LineItems, useDataTable, useLineItems } from "@tailor-platform/app-shell";
import { expect, it } from "vitest";
import { page } from "vitest/browser";
import LineItemsPage from "../../../../examples/vite-app/src/pages/showcase/line-items/page";

function OrderLines() {
  const value = useLineItems({
    columns: [{ accessorKey: "name", label: "Item" }],
    defaultLines: [
      { id: "A", name: "First" },
      { id: "B", name: "Second" },
      { id: "C", name: "Third" },
    ],
  });
  return (
    <LineItems.Root value={value}>
      <LineItems.Table />
    </LineItems.Root>
  );
}

function StandardTable() {
  const value = useDataTable({
    columns: [{ id: "name", label: "Item" }],
    data: {
      rows: [
        { id: "A", name: "First" },
        { id: "B", name: "Second" },
        { id: "C", name: "Third" },
      ],
    },
  });
  return (
    <DataTable.Root value={value}>
      <DataTable.Table />
    </DataTable.Root>
  );
}

it("demonstrates adding, removing and reverting lines in the example without taller rows", async () => {
  const user = userEvent.setup();
  render(
    <>
      <LineItemsPage />
      <StandardTable />
    </>,
  );
  const table = screen.getByRole("table", { name: "Order line items" });
  const names = () =>
    within(table)
      .getAllByRole("row")
      .slice(1)
      .map((row) => within(row).getAllByRole("cell")[1].textContent);
  const initial = ["Notebook", "Pen", "Pencil", "Eraser", "Ruler"];
  const discard = screen.getByRole("button", { name: "Discard changes" });
  expect(names()).toEqual(initial);
  expect(discard.hasAttribute("disabled")).toBe(true);
  const standard = screen.getAllByRole("table")[1];
  expect(within(table).getAllByRole("row")[1].getBoundingClientRect().height).toBe(
    within(standard).getAllByRole("row")[1].getBoundingClientRect().height,
  );

  await user.click(screen.getByRole("button", { name: "Add line" }));
  expect(names()).toEqual([...initial, "New item"]);
  expect(discard.hasAttribute("disabled")).toBe(false);
  await user.click(screen.getByRole("button", { name: "Delete New item" }));
  expect(names()).toEqual(initial);
  expect(discard.hasAttribute("disabled")).toBe(true);

  await user.click(screen.getByRole("button", { name: "Add line" }));
  await user.click(screen.getByRole("button", { name: "Delete Notebook" }));
  await user.click(screen.getByRole("button", { name: "Reorder line 2" }));
  await user.keyboard("{ArrowUp}");
  expect(names()).toEqual(["Pencil", "Pen", "Eraser", "Ruler", "New item"]);
  await user.click(discard);
  expect(names()).toEqual(initial);
  expect(discard.hasAttribute("disabled")).toBe(true);

  for (const item of initial) {
    await user.click(screen.getByRole("button", { name: `Delete ${item}` }));
  }
  expect(within(table).getByText("No lines yet.")).toBeDefined();
  await user.click(screen.getByRole("button", { name: "Add line" }));
  expect(names()).toEqual(["New item"]);
  await user.click(discard);
  expect(names()).toEqual(initial);
  expect(discard.hasAttribute("disabled")).toBe(true);
});

it("matches DataTable row height without a button hover highlight or shifting drop guides", async () => {
  render(
    <>
      <OrderLines />
      <StandardTable />
    </>,
  );
  const tables = screen.getAllByRole("table");
  const rows = within(tables[0]).getAllByRole("row").slice(1);
  const standardRows = within(tables[1]).getAllByRole("row").slice(1);
  expect(rows.map((row) => row.getBoundingClientRect().height)).toEqual(
    standardRows.map((row) => row.getBoundingClientRect().height),
  );
  const height = rows[1].getBoundingClientRect().height;
  const handle = screen.getByRole("button", { name: "Reorder line 1" });
  expect(getComputedStyle(handle).width).toBe("24px");
  await page.getByRole("button", { name: "Reorder line 1" }).hover();
  expect(getComputedStyle(handle).backgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect(getComputedStyle(handle).boxShadow).toBe("none");

  const dataTransfer = new DataTransfer();
  fireEvent.dragStart(handle, { dataTransfer });
  fireEvent.dragOver(rows[1], { dataTransfer, clientY: rows[1].getBoundingClientRect().top + 1 });
  const target = within(rows[1]).getAllByRole("cell")[0];
  expect(getComputedStyle(target).boxShadow).not.toBe("none");
  expect(rows[1].getBoundingClientRect().height).toBe(height);
  fireEvent.dragEnd(handle);
  expect(getComputedStyle(target).boxShadow).toBe("none");
});

it("keeps keyboard focus on the moved row, including at the boundaries", async () => {
  const user = userEvent.setup();
  render(<OrderLines />);
  const names = () =>
    screen
      .getAllByRole("row")
      .slice(1)
      .map((row) => within(row).getAllByRole("cell")[1].textContent);
  const handle = screen.getByRole("button", { name: "Reorder line 1" });
  await user.click(handle);
  await user.keyboard("{ArrowDown}");
  expect(names()).toEqual(["Second", "First", "Third"]);
  expect(document.activeElement).toBe(handle);
  await user.keyboard("{ArrowDown}");
  expect(names()).toEqual(["Second", "Third", "First"]);
  expect(document.activeElement).toBe(handle);
  await user.keyboard("{ArrowDown}");
  expect(names()).toEqual(["Second", "Third", "First"]);

  await user.keyboard("{ArrowUp}{ArrowUp}");
  expect(names()).toEqual(["First", "Second", "Third"]);
  expect(document.activeElement).toBe(handle);
  await user.keyboard("{ArrowUp}");
  expect(names()).toEqual(["First", "Second", "Third"]);
  expect(document.activeElement).toBe(handle);
  expect(screen.getByRole("status").textContent).toBe("Moved line 2 to position 1.");
});

it("reorders through native dragging from the leftmost handle", async () => {
  render(<OrderLines />);
  const names = () =>
    screen
      .getAllByRole("row")
      .slice(1)
      .map((row) => within(row).getAllByRole("cell")[1].textContent);
  const handle = screen.getByRole("button", { name: "Reorder line 1" });
  expect(screen.getAllByRole("cell")[0].contains(handle)).toBe(true);
  const target = page.getByRole("row").nth(3);
  await page.getByRole("button", { name: "Reorder line 1" }).dropTo(target, {
    targetPosition: { x: 4, y: target.element().getBoundingClientRect().height - 4 },
  });
  expect(names()).toEqual(["Second", "Third", "First"]);
  expect(document.activeElement).toBe(handle);
  expect(screen.getByRole("status").textContent).toBe("Moved line 1 to position 3.");

  await page
    .getByRole("button", { name: "Reorder line 3" })
    .dropTo(page.getByRole("row").nth(1), { targetPosition: { x: 4, y: 4 } });
  expect(names()).toEqual(["First", "Second", "Third"]);
  expect(document.activeElement).toBe(handle);
  expect(screen.queryByRole("button", { name: /Move line/ })).toBeNull();
});
