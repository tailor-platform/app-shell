import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SidebarLayout, defineModule } from "@tailor-platform/app-shell";
import { AppShell } from "@tailor-platform/app-shell/testing";
import LineItemsPage from "../../../../examples/vite-app/src/pages/showcase/line-items/page";

afterEach(cleanup);
const empty = { added: [], updated: [], removed: [], order: null };
const preview = (name: string) =>
  JSON.parse(screen.getByRole("region", { name }).querySelector("textarea")!.value);
const status = () => screen.getByRole("status", { name: "Save status" });
const input = (label: string, row = 1) =>
  screen.getByRole("textbox", { name: `${label}, Row ${row}` }) as HTMLInputElement;
const waitForSave = (message: string) =>
  waitFor(() => expect(status().textContent).toBe(message), { timeout: 3000 });

async function setup() {
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
  const draft = async (label: string, value: string, row = 1) => {
    await user.click(input(label, row));
    await user.clear(input(label, row));
    if (value) await user.type(input(label, row), value);
  };
  const edit = async (label: string, value: string, row = 1) => {
    await draft(label, value, row);
    await user.keyboard("{Enter}");
    if (label === "Quantity") {
      if (value && Number.isSafeInteger(Number(value)) && Number(value) > 0) {
        await waitFor(() =>
          expect(preview("Committed lines")[row - 1].quantity).toBe(Number(value)),
        );
      } else {
        await screen.findByRole("button", { name: `Show error for Quantity, Row ${row}` });
      }
    }
  };
  return { user, draft, edit };
}

it("demonstrates committed values, equality, net cancellation, clears, removals, and ordered membership", async () => {
  const { user, edit } = await setup();
  const discard = screen.getByRole("button", { name: "Discard changes" });
  expect(preview("getChanges()")).toEqual(empty);
  expect(screen.queryByRole("button", { name: /Reorder line/ })).toBeNull();
  expect(screen.queryByRole("textbox", { name: "Unit price, Row 1" })).toBeNull();

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
  expect(input("Quantity").value).toBe("2");

  await user.click(screen.getByRole("button", { name: "Add line" }));
  expect(preview("getChanges()").added).toMatchObject([
    { item: "New item", quantity: 1, notes: "New line note" },
  ]);
  expect(preview("getChanges()").order).toEqual(
    preview("Committed lines").map((line: { lineKey: string }) => line.lineKey),
  );
  await user.click(screen.getByRole("button", { name: "Delete New item" }));
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

it("saves focused input after async validation, locks consumer controls, and adopts a new baseline", async () => {
  const { user, draft, edit } = await setup();
  await draft("Quantity", "5");
  expect(preview("Committed lines")[0].quantity).toBe(2);
  expect(preview("getChanges()")).toEqual(empty);
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(screen.getByRole("button", { name: "Save" }).hasAttribute("disabled")).toBe(true);
  expect(screen.getByRole("button", { name: "Add line" }).hasAttribute("disabled")).toBe(true);
  expect(screen.getByRole("button", { name: "Discard changes" }).hasAttribute("disabled")).toBe(
    true,
  );
  expect(screen.getByRole("button", { name: "Delete Notebook" }).hasAttribute("disabled")).toBe(
    true,
  );
  expect(screen.getByRole("tab", { name: "Readonly" }).getAttribute("aria-disabled")).toBe("true");
  const failureControl = screen.getByRole("checkbox", { name: "Simulate save failure" });
  expect(
    failureControl.hasAttribute("disabled") ||
      failureControl.getAttribute("aria-disabled") === "true",
  ).toBe(true);
  expect(input("Quantity").readOnly).toBe(true);
  await waitForSave("Saved. Confirmed data is the new baseline.");

  expect(preview("Committed lines")[0].quantity).toBe(5);
  expect(preview("getChanges()")).toEqual(empty);
  expect(input("Quantity").getAttribute("aria-disabled")).toBeNull();
  await user.click(input("Quantity"));
  expect(input("Quantity").readOnly).toBe(false);
  await edit("Quantity", "7");
  await user.click(screen.getByRole("button", { name: "Discard changes" }));
  expect(preview("Committed lines")[0].quantity).toBe(5);

  await edit("Item", "NOTEBOOK");
  expect(preview("getChanges()")).toEqual(empty);
  await user.click(screen.getByRole("button", { name: "Save" }));
  await waitForSave("Saved. Confirmed data is the new baseline.");
  expect(preview("Committed lines")[0].item).toBe("Notebook");
  expect(preview("getChanges()")).toEqual(empty);
});

it("does not persist rejected input and retains malformed numeric drafts across blur and Save", async () => {
  const { user, draft } = await setup();
  await draft("Quantity", "-");
  await user.click(screen.getByRole("button", { name: "Save" }));
  await waitForSave("Input could not be confirmed. Correct it and retry.");
  expect(input("Quantity").value).toBe("-");
  expect(input("Quantity").getAttribute("aria-invalid")).toBe("true");
  expect(preview("Committed lines")[0].quantity).toBe(2);
  expect(preview("getChanges()")).toEqual(empty);
  expect(screen.getByRole("button", { name: "Save" }).hasAttribute("disabled")).toBe(false);

  await draft("Quantity", "0");
  await user.click(screen.getByRole("button", { name: "Save" }));
  await waitForSave("Input could not be confirmed. Correct it and retry.");
  expect(input("Quantity").value).toBe("0");
  expect(preview("Committed lines")[0].quantity).toBe(2);

  await draft("Quantity", "6");
  await user.click(screen.getByRole("button", { name: "Save" }));
  await waitForSave("Saved. Confirmed data is the new baseline.");
  expect(preview("Committed lines")[0].quantity).toBe(6);
  expect(preview("getChanges()")).toEqual(empty);
});

it("retains failed saves and saves creations once with confirmed IDs and explicit clears", async () => {
  const { user, edit, draft } = await setup();
  await edit("Notes", "");
  await user.click(screen.getByRole("button", { name: "Add line" }));
  await user.click(screen.getByRole("checkbox", { name: "Simulate save failure" }));
  await draft("Item", "New saved item", 6);
  const temporaryKey = preview("Committed lines")[5].lineKey;
  await user.click(screen.getByRole("button", { name: "Save" }));
  await waitForSave("Simulated save failed. Unsaved changes are retained.");

  expect(preview("getChanges()").added).toMatchObject([{ item: "New saved item" }]);
  expect(preview("getChanges()").updated).toEqual([
    { lineKey: "line-1", changes: { notes: "[undefined]" } },
  ]);
  expect(preview("Committed lines")[5].lineKey).toBe(temporaryKey);
  expect(screen.getByRole("button", { name: "Add line" }).hasAttribute("disabled")).toBe(false);

  await user.click(screen.getByRole("checkbox", { name: "Simulate save failure" }));
  await user.click(screen.getByRole("button", { name: "Save" }));
  await waitForSave("Saved. Confirmed data is the new baseline.");
  const saved = preview("Committed lines")[5];
  expect(saved.id).toMatch(/^saved-line-/);
  expect(saved.lineKey).toBe(saved.id);
  expect(saved.lineKey).not.toBe(temporaryKey);
  expect(preview("Committed lines")[0].notes).toBe("[undefined]");
  expect(preview("getChanges()")).toEqual(empty);

  await edit("Quantity", "2", 6);
  expect(preview("getChanges()").added).toEqual([]);
  expect(preview("getChanges()").updated).toEqual([
    { lineKey: saved.id, changes: { quantity: 2 } },
  ]);
  await user.click(screen.getByRole("button", { name: "Discard changes" }));
  expect(preview("Committed lines")[5].quantity).toBe(1);
  await user.click(screen.getByRole("button", { name: "Delete New saved item" }));
  expect(preview("getChanges()").added).toEqual([]);
  expect(preview("getChanges()").removed).toMatchObject([{ id: saved.id }]);
  await user.click(screen.getByRole("button", { name: "Discard changes" }));
  expect(preview("Committed lines")).toHaveLength(6);
  expect(preview("getChanges()")).toEqual(empty);
});
