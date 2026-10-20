import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { AppShellConfigContext, buildConfigurations } from "@/contexts/appshell-context";
import { DataTable } from "./data-table";
import { useDataTable } from "./use-data-table";
import { createColumnHelper } from "./field-helpers";

afterEach(cleanup);

type Row = { id: string; expected: string | null };
const { column } = createColumnHelper<Row>();
const configurations = buildConfigurations({ modules: [], locale: "en", timeZone: "Asia/Tokyo" });

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <AppShellConfigContext.Provider value={{ configurations }}>
      <MemoryRouter>{children}</MemoryRouter>
    </AppShellConfigContext.Provider>
  );
}

function Harness({
  value,
  datetime,
  onValueChange,
  onValueCommitted,
}: {
  value: string | null;
  datetime: boolean;
  onValueChange: (row: Row, draft: unknown) => void;
  onValueCommitted: (row: Row, value: string | null) => void;
}) {
  const table = useDataTable<Row>({
    columns: [
      column({
        id: "expected",
        label: "Expected",
        type: "date",
        typeOptions: { dateFormat: datetime ? "datetime" : "short", locale: "en-US" },
        edit: { onValueChange, onValueCommitted },
      }),
    ],
    data: { rows: [{ id: "1", expected: value }] },
  });
  return (
    <DataTable.Root value={table}>
      <DataTable.Table />
    </DataTable.Root>
  );
}

function setup(value: string | null = "2026-10-02T00:00:00.000Z", datetime = true) {
  const user = userEvent.setup();
  const onValueChange = vi.fn();
  const onValueCommitted = vi.fn();
  const props = { value, datetime, onValueChange, onValueCommitted };
  const result = render(<Harness {...props} />, { wrapper: Wrapper });
  return {
    user,
    onValueChange,
    onValueCommitted,
    unmount: result.unmount,
    update: (next: string | null) => result.rerender(<Harness {...props} value={next} />),
  };
}

const trigger = () => screen.getByRole("button", { name: /^Expected/ });
const timeInput = () => screen.getByLabelText("Expected (Choose time)") as HTMLInputElement;
const done = () => screen.getByRole("button", { name: "Done" }) as HTMLButtonElement;
const dayButton = (day: string) =>
  within(document.querySelector<HTMLElement>('[data-slot="data-table-cell-calendar"]')!)
    .getAllByRole("button")
    .find((button) => button.textContent === day && !button.dataset.outsideMonth)!;
const baseline = { day: "2026-10-02", time: "09:00" };

describe("DataTable date-time drafts", () => {
  it("preserves a missing day and emits complete draft snapshots, not timestamps", async () => {
    const { user, onValueChange, onValueCommitted } = setup(null);
    await user.click(trigger());
    expect(onValueChange).not.toHaveBeenCalled();
    expect(done().disabled).toBe(true);
    fireEvent.change(timeInput(), { target: { value: "14:30" } });
    expect(onValueChange).toHaveBeenLastCalledWith(expect.objectContaining({ id: "1" }), {
      day: null,
      time: "14:30",
    });
    expect(done().disabled).toBe(true);
    await user.click(dayButton("15"));
    const snapshot = onValueChange.mock.lastCall![1] as { day: string; time: string };
    expect(snapshot).toEqual({ day: expect.stringMatching(/^\d{4}-\d{2}-15$/), time: "14:30" });
    expect(onValueCommitted).not.toHaveBeenCalled();
    expect(done().disabled).toBe(false);
    await user.click(done());
    expect(onValueCommitted).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ id: "1" }),
      new Date(`${snapshot.day}T14:30:00+09:00`).toISOString(),
    );
  });

  it("does not substitute midnight for a missing time, including date-only data", async () => {
    const { user, onValueChange, onValueCommitted } = setup("2026-10-02");
    await user.click(trigger());
    expect(timeInput().value).toBe("");
    expect(done().disabled).toBe(true);
    await user.click(dayButton("20"));
    expect(onValueChange).toHaveBeenLastCalledWith(expect.objectContaining({ id: "1" }), {
      day: "2026-10-20",
      time: null,
    });
    expect(done().disabled).toBe(true);
    await user.click(done());
    expect(onValueCommitted).not.toHaveBeenCalled();
  });

  it("notifies an emptied time as null and restores it on Escape without committing", async () => {
    const { user, onValueChange, onValueCommitted } = setup();
    await user.click(trigger());
    fireEvent.change(timeInput(), { target: { value: "" } });
    expect(onValueChange).toHaveBeenLastCalledWith(expect.objectContaining({ id: "1" }), {
      day: "2026-10-02",
      time: null,
    });
    expect(done().disabled).toBe(true);
    await user.keyboard("{Escape}");
    expect(onValueChange).toHaveBeenLastCalledWith(expect.objectContaining({ id: "1" }), baseline);
    expect(onValueCommitted).not.toHaveBeenCalled();
    await user.click(trigger());
    expect(timeInput().value).toBe("09:00");
  });

  it("cancels outside presses rather than confirming a complete draft", async () => {
    const { user, onValueChange, onValueCommitted } = setup();
    await user.click(trigger());
    await user.click(dayButton("20"));
    fireEvent.change(timeInput(), { target: { value: "14:30" } });
    await user.click(document.body);
    expect(onValueChange).toHaveBeenLastCalledWith(expect.objectContaining({ id: "1" }), baseline);
    expect(onValueCommitted).not.toHaveBeenCalled();
  });

  it("keeps active drafts on external updates and restores the latest data on cancellation", async () => {
    const { user, update, onValueChange, onValueCommitted } = setup();
    await user.click(trigger());
    await user.click(dayButton("20"));
    fireEvent.change(timeInput(), { target: { value: "14:30" } });
    onValueChange.mockClear();
    update("2026-10-25T07:45:00.000Z");
    expect(timeInput().value).toBe("14:30");
    expect(onValueChange).not.toHaveBeenCalled();
    expect(onValueCommitted).not.toHaveBeenCalled();
    await user.keyboard("{Escape}");
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: "1" }), {
      day: "2026-10-25",
      time: "16:45",
    });
    expect(onValueCommitted).not.toHaveBeenCalled();
  });

  it("compares a confirmed draft with latest data, not the value when opened", async () => {
    const { user, update, onValueChange, onValueCommitted } = setup();
    await user.click(trigger());
    await user.click(dayButton("20"));
    fireEvent.change(timeInput(), { target: { value: "14:30" } });
    onValueChange.mockClear();
    update("2026-10-20T05:30:00.000Z");
    expect(onValueChange).not.toHaveBeenCalled();
    await user.click(done());
    expect(onValueCommitted).not.toHaveBeenCalled();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("compares even an untouched open draft with latest data", async () => {
    const { user, update, onValueChange, onValueCommitted } = setup();
    await user.click(trigger());
    update("2026-10-25T07:45:00.000Z");
    expect(timeInput().value).toBe("09:00");
    await user.click(done());
    expect(onValueChange).not.toHaveBeenCalled();
    expect(onValueCommitted).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ id: "1" }),
      "2026-10-02T00:00:00.000Z",
    );
  });

  it("explicit Clear emits the empty snapshot before a null commitment", async () => {
    const { user, onValueChange, onValueCommitted } = setup();
    await user.click(trigger());
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: "1" }), {
      day: null,
      time: null,
    });
    expect(onValueCommitted).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ id: "1" }),
      null,
    );
    expect(onValueChange.mock.invocationCallOrder[0]).toBeLessThan(
      onValueCommitted.mock.invocationCallOrder[0],
    );
  });

  it("does not notify unchanged Clear or dismissal", async () => {
    const { user, onValueChange, onValueCommitted } = setup(null);
    await user.click(trigger());
    await user.click(screen.getByRole("button", { name: "Clear" }));
    await user.click(trigger());
    await user.keyboard("{Escape}");
    expect(onValueChange).not.toHaveBeenCalled();
    expect(onValueCommitted).not.toHaveBeenCalled();
  });

  it("discards active drafts silently on unmount", async () => {
    const { user, unmount, onValueChange, onValueCommitted } = setup();
    await user.click(trigger());
    await user.click(dayButton("20"));
    onValueChange.mockClear();
    unmount();
    expect(onValueChange).not.toHaveBeenCalled();
    expect(onValueCommitted).not.toHaveBeenCalled();
  });

  it("emits date-only string drafts followed by the confirmed day", async () => {
    const { user, onValueChange, onValueCommitted } = setup("2026-10-02", false);
    await user.click(trigger());
    await user.click(dayButton("20"));
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ id: "1" }),
      "2026-10-20",
    );
    expect(onValueCommitted).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ id: "1" }),
      "2026-10-20",
    );
    expect(onValueChange.mock.invocationCallOrder[0]).toBeLessThan(
      onValueCommitted.mock.invocationCallOrder[0],
    );
  });
});
