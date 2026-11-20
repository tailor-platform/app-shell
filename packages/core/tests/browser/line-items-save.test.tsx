import { useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import {
  Button,
  LineItems,
  SidebarLayout,
  Text,
  defineModule,
  useLineItems,
} from "@tailor-platform/app-shell";
import { AppShell } from "@tailor-platform/app-shell/testing";

afterEach(cleanup);

function Page() {
  const [status, setStatus] = useState("Idle");
  const lines = useLineItems<{ id?: string; date: string | null }>({
    defaultLines: [{ id: "A", date: "2026-10-02T00:00:00.000Z" }],
    orderer: false,
    columns: [
      {
        accessorKey: "date",
        label: "Date",
        type: "datetime",
        edit: { editorType: "date", editorOptions: { withTime: true } },
      },
    ],
  });
  async function save() {
    const changes = await lines.commitChanges();
    if (changes === null) {
      setStatus("Rejected");
      return;
    }
    try {
      setStatus(JSON.stringify(changes));
    } finally {
      lines.finishSave();
    }
  }
  return (
    <>
      <LineItems.Root value={lines}>
        <LineItems.Table aria-label="Date lines" />
      </LineItems.Root>
      <Button type="button" disabled={lines.isSaveLocked} onClick={() => void save()}>
        Save date
      </Button>
      <Text render={<output aria-label="Save result" />}>{status}</Text>
      <Text render={<output aria-label="Committed date" />}>{lines.lines[0].date}</Text>
    </>
  );
}

async function setup() {
  render(
    <AppShell
      memory
      initialEntries={["/lines"]}
      locale="en"
      timeZone="UTC"
      modules={[
        defineModule({ path: "lines", meta: { title: "Lines" }, component: Page, resources: [] }),
      ]}
    >
      <SidebarLayout />
    </AppShell>,
  );
  const user = userEvent.setup();
  await screen.findByRole("table", { name: "Date lines" });
  await user.click(screen.getByRole("button", { name: /^Date, Row 1/ }));
  const popup = document.querySelector<HTMLElement>('[data-slot="line-items-cell-calendar"]')!;
  const nextDay = within(popup)
    .getAllByRole("button")
    .find((button) => button.textContent === "3" && !button.dataset.outsideMonth)!;
  await user.click(nextDay);
  return { user, time: screen.getByLabelText("Date, Row 1 (Time)") as HTMLInputElement };
}

it("clicking Save outside a datetime popup confirms the pending input instead of discarding it", async () => {
  const { user, time } = await setup();
  act(() => fireEvent.change(time, { target: { value: "09:30" } }));
  expect(screen.getByRole("status", { name: "Committed date" }).textContent).toBe(
    "2026-10-02T00:00:00.000Z",
  );
  await user.click(screen.getByRole("button", { name: "Save date" }));
  await waitFor(() =>
    expect(screen.getByRole("status", { name: "Save result" }).textContent).toContain(
      "2026-10-03T09:30:00.000Z",
    ),
  );
  expect(screen.getByRole("status", { name: "Committed date" }).textContent).toBe(
    "2026-10-03T09:30:00.000Z",
  );
});

it("clicking Save outside an incomplete datetime popup retains input and rejects preparation", async () => {
  const { user, time } = await setup();
  act(() => fireEvent.change(time, { target: { value: "" } }));
  await user.click(screen.getByRole("button", { name: "Save date" }));
  await waitFor(() =>
    expect(screen.getByRole("status", { name: "Save result" }).textContent).toBe("Rejected"),
  );
  expect(screen.getByRole("status", { name: "Committed date" }).textContent).toBe(
    "2026-10-02T00:00:00.000Z",
  );
  expect(screen.getByRole("button", { name: /^Date, Row 1/ }).getAttribute("aria-invalid")).toBe(
    "true",
  );
  await user.click(screen.getByRole("button", { name: /^Date, Row 1/ }));
  expect((screen.getByLabelText("Date, Row 1 (Time)") as HTMLInputElement).value).toBe("");
});
