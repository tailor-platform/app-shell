import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SidebarLayout, defineModule } from "@tailor-platform/app-shell";
import { AppShell } from "@tailor-platform/app-shell/testing";
import LineItemsPage from "../../../examples/vite-app/src/pages/showcase/line-items/page";

afterEach(cleanup);
const empty = { added: [], updated: [], removed: [], order: null };
const preview = (name: string) =>
  JSON.parse(screen.getByRole("region", { name }).querySelector("textarea")!.value);

it("demonstrates committed values, equality, net cancellation, clears, removals, and order", async () => {
  const user = userEvent.setup();
  render(
    <AppShell
      memory
      initialEntries={["/lines"]}
      locale="en"
      modules={[
        defineModule({
          path: "lines",
          meta: { title: "Lines" },
          component: LineItemsPage,
          resources: [],
        }),
      ]}
    >
      <SidebarLayout />
    </AppShell>,
  );
  await screen.findByRole("table", { name: "Order line items" });
  const edit = async (label: string, value: string) => {
    const input = screen.getByRole("textbox", { name: `${label}, Row 1` });
    await user.click(input);
    await user.clear(input);
    if (value) await user.type(input, value);
    await user.keyboard("{Enter}");
  };
  const discard = screen.getByRole("button", { name: "Discard changes" });
  expect(preview("getChanges()")).toEqual(empty);

  await edit("Item", "NOTEBOOK");
  expect(preview("Committed lines")[0].item).toBe("NOTEBOOK");
  expect(preview("getChanges()")).toEqual(empty);
  expect(screen.getByRole("status", { name: "Line change summary" }).textContent).toContain(
    "isDirty: false",
  );
  expect(discard.hasAttribute("disabled")).toBe(false);
  await user.click(discard);
  expect(preview("Committed lines")[0].item).toBe("Notebook");

  await edit("Notes", "");
  expect(preview("getChanges()").updated).toEqual([
    { lineKey: "line-1", changes: { notes: "[undefined]" } },
  ]);
  await edit("Notes", "Deliver together");
  expect(preview("getChanges()")).toEqual(empty);

  await edit("Quantity", "5");
  expect(preview("getChanges()").updated).toEqual([
    { lineKey: "line-1", changes: { quantity: 5 } },
  ]);
  await edit("Quantity", "2");
  expect(preview("getChanges()")).toEqual(empty);
  await edit("Quantity", "0");
  expect(preview("Committed lines")[0].quantity).toBe(2);
  expect(preview("getChanges()")).toEqual(empty);
  await user.click(discard);
  expect((screen.getByRole("textbox", { name: "Quantity, Row 1" }) as HTMLInputElement).value).toBe(
    "2",
  );

  await user.click(screen.getByRole("button", { name: "Add line" }));
  expect(preview("getChanges()").added).toMatchObject([
    { item: "New item", quantity: 1, notes: "New line note" },
  ]);
  expect(preview("getChanges()").order).toEqual(
    preview("Committed lines").map((line: { lineKey: string }) => line.lineKey),
  );
  await user.click(screen.getByRole("button", { name: "Delete New item" }));
  expect(preview("getChanges()")).toEqual(empty);

  await user.click(screen.getByRole("button", { name: "Reorder line 2" }));
  await user.keyboard("{ArrowUp}");
  expect(preview("getChanges()").order).toEqual(["line-2", "line-1", "line-3", "line-4", "line-5"]);
  await user.keyboard("{ArrowDown}");
  expect(preview("getChanges()")).toEqual(empty);

  await edit("Quantity", "5");
  await user.click(screen.getByRole("button", { name: "Delete Notebook" }));
  expect(preview("getChanges()").updated).toEqual([]);
  expect(preview("getChanges()").removed).toMatchObject([
    { id: "line-1", quantity: 2, notes: "Deliver together" },
  ]);
  await user.click(discard);
  await user.click(screen.getByRole("tab", { name: "Readonly" }));
  expect(preview("getChanges()")).toEqual(empty);
  expect(screen.queryByRole("button", { name: "Add line" })).toBeNull();
});
