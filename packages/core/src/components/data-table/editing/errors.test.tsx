import { StrictMode } from "react";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { CellEditError, type TextCellEditOptions } from "@/index";
import { createAppShellWrapper } from "../../../../tests/test-utils";
import { DataTable } from "../data-table";
import { useDataTable } from "../use-data-table";
import type { Column } from "../types";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

type Row = { id: string; value: string | null };
const ROWS: Row[] = [{ id: "1", value: "Original" }];
const noop = () => {};

function Harness({ edit, rows = ROWS }: { edit: TextCellEditOptions<Row>; rows?: Row[] }) {
  const columns: Column<Row>[] = [{ id: "value", label: "Value", type: "text", edit }];
  const table = useDataTable<Row>({ columns, data: { rows } });
  return (
    <>
      <button type="button">Before table</button>
      <DataTable.Root value={table}>
        <DataTable.Table />
      </DataTable.Root>
      <button type="button">Outside</button>
    </>
  );
}

function renderEditor(
  edit: TextCellEditOptions<Row>,
  { locale = "en", rows = ROWS }: { locale?: string; rows?: Row[] } = {},
) {
  const user = userEvent.setup();
  const ui = (nextRows: Row[]) => (
    <StrictMode>
      <MemoryRouter>
        <Harness edit={edit} rows={nextRows} />
      </MemoryRouter>
    </StrictMode>
  );
  const view = render(ui(rows), { wrapper: createAppShellWrapper(locale) });
  const inputs = screen.getAllByRole("textbox", { name: "Value" }) as HTMLInputElement[];
  return {
    ...view,
    user,
    input: inputs[0],
    inputs,
    updateRows: (nextRows: Row[]) => view.rerender(ui(nextRows)),
  };
}

function change(input: HTMLInputElement, value = "Changed") {
  act(() => input.focus());
  fireEvent.change(input, { target: { value } });
}

function deferred() {
  let resolve!: () => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function rejectRequest(request: ReturnType<typeof deferred>, reason: unknown) {
  await act(async () => {
    request.reject(reason);
    await request.promise.catch(noop);
  });
}

async function resolveRequest(request: ReturnType<typeof deferred>) {
  await act(async () => {
    request.resolve();
    await request.promise;
  });
}

function renderColumn(column: Column<Row>, rows = ROWS) {
  function TableHarness() {
    const table = useDataTable({ columns: [column], data: { rows } });
    return (
      <DataTable.Root value={table}>
        <DataTable.Table />
      </DataTable.Root>
    );
  }
  render(
    <MemoryRouter>
      <TableHarness />
    </MemoryRouter>,
    { wrapper: createAppShellWrapper("en") },
  );
  return userEvent.setup();
}

const errorTrigger = () => screen.getByRole("button", { name: "Show error for Value" });
const queryErrorTrigger = () => screen.queryByRole("button", { name: "Show error for Value" });

describe("DataTable callback error presentation", () => {
  it("exports CellEditError as a named native error", () => {
    const error = new CellEditError("Enter a quantity");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("CellEditError");
    expect(error.message).toBe("Enter a quantity");
  });

  it.each(["change", "commit"] as const)(
    "automatically shows a synchronous %s failure without moving focus",
    async (source) => {
      const failure = new CellEditError("Cannot accept this value");
      const fail = vi.fn(() => {
        throw failure;
      });
      const onValueCommitted = source === "commit" ? fail : vi.fn();
      const { input } = renderEditor({
        onValueChange: source === "change" ? fail : undefined,
        onValueCommitted,
      });
      change(input);
      if (source === "commit") fireEvent.keyDown(input, { key: "Enter" });

      expect(input.getAttribute("aria-invalid")).toBe("true");
      expect(
        document.getElementById(input.getAttribute("aria-describedby")!)?.textContent,
      ).toContain(failure.message);
      const popup = await screen.findByRole("dialog", { name: "Error in Value" });
      expect(within(popup).getByText(failure.message)).toBeDefined();
      expect(within(popup).getByRole("button", { name: "Close error details" })).toBeDefined();
      expect(document.activeElement).toBe(input);
      expect(fail).toHaveBeenCalledExactlyOnceWith(ROWS[0], "Changed");
      expect(input.value).toBe("Changed");
      expect(input.readOnly).toBe(false);
      if (source === "change") {
        fireEvent.keyDown(input, { key: "Enter" });
        expect(onValueCommitted).not.toHaveBeenCalled();
      }
    },
  );

  it.each(["change", "commit"] as const)(
    "retains the draft while a returned %s promise is pending and after rejection",
    async (source) => {
      const request = deferred();
      const { input } = renderEditor({
        onValueChange: source === "change" ? () => request.promise : undefined,
        onValueCommitted: source === "commit" ? () => request.promise : noop,
      });
      change(input);
      if (source === "commit") {
        fireEvent.keyDown(input, { key: "Enter" });
        expect(input.closest("td")?.getAttribute("aria-busy")).toBe("true");
      }
      expect(input.readOnly).toBe(false);
      expect(input.value).toBe("Changed");
      expect(queryErrorTrigger()).toBeNull();
      await rejectRequest(request, new CellEditError("Server rejected the value"));
      expect(input.value).toBe("Changed");
      expect(input.readOnly).toBe(false);
      expect(input.closest("td")?.getAttribute("aria-busy")).toBeNull();
      expect(
        within(await screen.findByRole("dialog", { name: "Error in Value" })).getByText(
          "Server rejected the value",
        ),
      ).toBeDefined();
      expect(document.activeElement).toBe(input);
    },
  );

  it("dismisses only the details until a new failure and supports mouse and keyboard reopening", async () => {
    const onValueChange = vi.fn(() => {
      throw new Error("Draft rejected");
    });
    const onValueCommitted = vi.fn();
    const { input, user, updateRows } = renderEditor({ onValueChange, onValueCommitted });
    change(input);
    const popup = await screen.findByRole("dialog", { name: "Error in Value" });
    await user.click(within(popup).getByRole("button", { name: "Close error details" }));
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(input.value).toBe("Changed");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(queryErrorTrigger()).not.toBeNull();
    updateRows([{ ...ROWS[0] }]);
    await user.click(screen.getByRole("button", { name: "Outside" }));
    await user.click(input);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueCommitted).not.toHaveBeenCalled();

    await user.click(errorTrigger());
    const reopened = await screen.findByRole("dialog", { name: "Error in Value" });
    await vi.waitFor(() =>
      expect(document.activeElement).toBe(
        within(reopened).getByRole("button", { name: "Close error details" }),
      ),
    );
    await user.keyboard("{Escape}");
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await user.keyboard("{Alt>}{ArrowDown}{/Alt}");
    const keyboardPopup = await screen.findByRole("dialog", { name: "Error in Value" });
    const close = within(keyboardPopup).getByRole("button", { name: "Close error details" });
    await vi.waitFor(() => expect(document.activeElement).toBe(close));
    await user.keyboard("{Enter}");
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await user.click(input);
    fireEvent.change(input, { target: { value: "New draft" } });
    expect(await screen.findByRole("dialog", { name: "Error in Value" })).toBeDefined();
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe("New draft");
    expect(onValueChange).toHaveBeenCalledTimes(2);
    expect(onValueCommitted).not.toHaveBeenCalled();
  });

  it.each(["outside", "next cell"] as const)(
    "auto-opens an async failure after moving to %s without stealing focus on open or dismissal",
    async (destination) => {
      const save = deferred();
      const onValueCommitted = vi.fn(() => save.promise);
      const { input, inputs, user } = renderEditor(
        { onValueCommitted },
        { rows: [...ROWS, { id: "2", value: "Second" }] },
      );
      const target =
        destination === "outside" ? screen.getByRole("button", { name: "Outside" }) : inputs[1];
      change(input);
      if (destination === "outside") await user.click(target);
      else await user.tab();
      expect(document.activeElement).toBe(target);
      await rejectRequest(save, new CellEditError("Save failed"));
      expect(
        within(await screen.findByRole("dialog", { name: "Error in Value" })).getByText(
          "Save failed",
        ),
      ).toBeDefined();
      expect(document.activeElement).toBe(target);
      await user.click(target);
      await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(document.activeElement).toBe(target);
      expect(input.value).toBe("Changed");
      expect(input.getAttribute("aria-invalid")).toBe("true");
      expect(onValueCommitted).toHaveBeenCalledTimes(1);
    },
  );

  it.each(["automatic", "manual"] as const)(
    "preserves the outside click destination when dismissing %s details",
    async (opening) => {
      const onValueCommitted = vi.fn(() => {
        throw new CellEditError("Save failed");
      });
      const { input, user } = renderEditor({ onValueCommitted });
      change(input);
      await user.keyboard("{Enter}");
      await screen.findByRole("dialog", { name: "Error in Value" });
      if (opening === "manual") {
        await user.keyboard("{Escape}");
        await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
        await user.click(errorTrigger());
        await screen.findByRole("dialog", { name: "Error in Value" });
      }

      const outside = screen.getByRole("button", { name: "Outside" });
      await user.click(outside);
      await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(document.activeElement).toBe(outside);
      expect(input.value).toBe("Changed");
      expect(input.getAttribute("aria-invalid")).toBe("true");
      expect(onValueCommitted).toHaveBeenCalledTimes(1);
    },
  );

  it("supports custom error content, keyboard inspection, and interactive actions without committing the draft", async () => {
    const failure = { code: "INVALID" };
    const onValueCommitted = vi.fn();
    const onAction = vi.fn();
    const renderError = vi.fn(({ row, error }: { row: Row; error: unknown }) => (
      <>
        <p>{`${row.id}: ${(error as typeof failure).code}`}</p>
        <button type="button" onClick={onAction}>
          Explain this error
        </button>
      </>
    ));
    const { input, user } = renderEditor({
      onValueChange: () => {
        throw failure;
      },
      onValueCommitted,
      error: { render: renderError },
    });
    change(input);
    const popup = await screen.findByRole("dialog", { name: "Error in Value" });
    expect(document.activeElement).toBe(input);
    await user.keyboard("{Alt>}{ArrowDown}{/Alt}");
    expect(document.activeElement).toBe(popup);
    await user.tab();
    expect(within(popup).getByText("1: INVALID")).toBeDefined();
    expect(renderError).toHaveBeenCalledWith({ row: ROWS[0], error: failure });
    const action = within(popup).getByRole("button", { name: "Explain this error" });
    expect(within(popup).getAllByRole("button")).toEqual([
      action,
      within(popup).getByRole("button", { name: "Close error details" }),
    ]);
    await vi.waitFor(() => expect(document.activeElement).toBe(action));
    await user.tab();
    expect(document.activeElement).toBe(
      within(popup).getByRole("button", { name: "Close error details" }),
    );
    expect(screen.getByRole("dialog", { name: "Error in Value" })).toBe(popup);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(action);
    await user.keyboard("{Enter}");
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onValueCommitted).not.toHaveBeenCalled();
    expect(input.value).toBe("Changed");

    await user.keyboard("{Escape}");
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onValueCommitted).not.toHaveBeenCalled();
    expect(input.value).toBe("Changed");
    await user.click(input);
    expect(input.value).toBe("Changed");
    expect(onValueCommitted).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Outside" }));
    expect(onValueCommitted).not.toHaveBeenCalled();
    expect(input.value).toBe("Changed");
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  it.each([
    new Error("Internal server details"),
    new TypeError("Internal type details"),
    Object.assign(new Error("Not a CellEditError instance"), { name: "CellEditError" }),
    new CellEditError(""),
    null,
    undefined,
    false,
    "not an Error",
  ])("uses generic visual and accessible feedback for thrown %j", async (failure) => {
    const { input } = renderEditor({
      onValueChange: () => {
        throw failure;
      },
      onValueCommitted: noop,
    });
    change(input);
    const popup = await screen.findByRole("dialog", { name: "Error in Value" });
    expect(within(popup).getByText("Could not confirm this change")).toBeDefined();
    expect(document.getElementById(input.getAttribute("aria-describedby")!)?.textContent).toBe(
      "Could not confirm this change. Press Alt+ArrowDown for error details",
    );
    expect(popup.textContent).toBe("Could not confirm this change");
    expect(input.value).toBe("Changed");
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  it.each(["change", "commit"] as const)(
    "hides unexpected errors from rejected %s promises",
    async (source) => {
      const request = deferred();
      const { input } = renderEditor({
        onValueChange: source === "change" ? () => request.promise : undefined,
        onValueCommitted: source === "commit" ? () => request.promise : noop,
      });
      change(input);
      if (source === "commit") fireEvent.keyDown(input, { key: "Enter" });
      await rejectRequest(request, new Error("Internal server details"));
      const popup = await screen.findByRole("dialog", { name: "Error in Value" });
      expect(popup.textContent).toBe("Could not confirm this change");
      expect(document.getElementById(input.getAttribute("aria-describedby")!)?.textContent).toBe(
        "Could not confirm this change. Press Alt+ArrowDown for error details",
      );
      expect(input.value).toBe("Changed");
      expect(input.getAttribute("aria-invalid")).toBe("true");
    },
  );

  it("passes unexpected errors unchanged to custom renderers without leaking them into accessible feedback", async () => {
    const failure = new Error("Internal server details");
    const renderError = vi.fn(() => <p>Custom feedback</p>);
    const { input } = renderEditor({
      onValueCommitted: () => {
        throw failure;
      },
      error: { render: renderError },
    });
    change(input);
    fireEvent.keyDown(input, { key: "Enter" });
    const popup = await screen.findByRole("dialog", { name: "Error in Value" });
    expect(popup.textContent).toBe("Custom feedback");
    expect(renderError).toHaveBeenCalledWith({ row: ROWS[0], error: failure });
    expect(document.getElementById(input.getAttribute("aria-describedby")!)?.textContent).toBe(
      "Could not confirm this change. Press Alt+ArrowDown for error details",
    );
  });

  it.each([
    { failure: new Error("Internal server details"), message: "変更を確定できませんでした" },
    { failure: new CellEditError("数量を入力してください"), message: "数量を入力してください" },
  ])("localizes popup labels and displays $message", async ({ failure, message }) => {
    const { input } = renderEditor(
      {
        onValueChange: () => {
          throw failure;
        },
        onValueCommitted: noop,
      },
      { locale: "ja" },
    );
    change(input);
    const popup = await screen.findByRole("dialog", { name: "Valueのエラー" });
    expect(within(popup).getByText(message)).toBeDefined();
    expect(within(popup).getByRole("button", { name: "エラーの詳細を閉じる" })).toBeDefined();
    expect(document.getElementById(input.getAttribute("aria-describedby")!)?.textContent).toBe(
      `${message}. Alt+↓キーでエラーの詳細を表示できます`,
    );
  });

  it("clears an error on a newer successful input and ignores older rejection results", async () => {
    const old = deferred();
    const current = deferred();
    const { input } = renderEditor({
      onValueChange: (_row, draft) => {
        if (draft === "Older") return old.promise;
        if (draft === "Current") return current.promise;
        return undefined;
      },
      onValueCommitted: noop,
    });
    change(input, "Older");
    fireEvent.change(input, { target: { value: "Current" } });
    await rejectRequest(current, new CellEditError("Current failure"));
    expect(input.getAttribute("aria-invalid")).toBe("true");
    await rejectRequest(old, new Error("Outdated failure"));
    expect(document.getElementById(input.getAttribute("aria-describedby")!)?.textContent).toContain(
      "Current failure",
    );
    fireEvent.change(input, { target: { value: "Newer" } });
    expect(queryErrorTrigger()).toBeNull();
    expect(input.getAttribute("aria-invalid")).toBeNull();
  });

  it("does not attach a rejected save to a newer unfinished draft", async () => {
    const request = deferred();
    const { input } = renderEditor({ onValueCommitted: () => request.promise });
    change(input);
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.change(input, { target: { value: "New draft" } });
    await rejectRequest(request, new Error("Old save failure"));
    expect(input.value).toBe("New draft");
    expect(queryErrorTrigger()).toBeNull();
  });

  it.each(["resolve", "reject"] as const)(
    "waits for the latest change check to %s before attempting confirmation",
    async (outcome) => {
      const check = deferred();
      const onValueCommitted = vi.fn();
      const { input } = renderEditor({
        onValueChange: () => check.promise,
        onValueCommitted,
      });
      change(input);
      fireEvent.keyDown(input, { key: "Enter" });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(input.value).toBe("Changed");
      expect(input.closest("td")?.getAttribute("aria-busy")).toBe("true");
      expect(onValueCommitted).not.toHaveBeenCalled();
      if (outcome === "resolve") {
        await resolveRequest(check);
        expect(onValueCommitted).toHaveBeenCalledExactlyOnceWith(ROWS[0], "Changed");
        expect(input.value).toBe("Original");
        expect(input.readOnly).toBe(true);
        expect(queryErrorTrigger()).toBeNull();
      } else {
        await rejectRequest(check, new Error("Draft check failed"));
        expect(onValueCommitted).not.toHaveBeenCalled();
        expect(input.value).toBe("Changed");
        expect(input.readOnly).toBe(false);
        expect(input.getAttribute("aria-invalid")).toBe("true");
      }
      expect(input.closest("td")?.getAttribute("aria-busy")).toBeNull();
    },
  );

  it("deduplicates Enter and blur while confirming, then clears the draft only on success", async () => {
    const save = deferred();
    const onValueCommitted = vi.fn(() => save.promise);
    const { input, user } = renderEditor({ onValueCommitted });
    change(input);
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.keyDown(input, { key: "Enter" });
    const outside = screen.getByRole("button", { name: "Outside" });
    await user.click(outside);
    expect(document.activeElement).toBe(outside);
    expect(onValueCommitted).toHaveBeenCalledExactlyOnceWith(ROWS[0], "Changed");
    expect(input.value).toBe("Changed");
    expect(input.readOnly).toBe(false);
    expect(input.closest("td")?.getAttribute("aria-busy")).toBe("true");
    await resolveRequest(save);
    expect(input.value).toBe("Original");
    expect(input.readOnly).toBe(true);
    expect(input.closest("td")?.getAttribute("aria-busy")).toBeNull();
    expect(document.activeElement).toBe(outside);
    expect(onValueCommitted).toHaveBeenCalledTimes(1);
  });

  it("retains an async blur failure through refocus and unchanged blur, then permits an Enter retry", async () => {
    const save = deferred();
    let rejected = true;
    const onValueCommitted = vi.fn(() => (rejected ? save.promise : undefined));
    const { input, user } = renderEditor({ onValueCommitted });
    const outside = screen.getByRole("button", { name: "Outside" });
    change(input);
    await user.click(outside);
    expect(onValueCommitted).toHaveBeenCalledExactlyOnceWith(ROWS[0], "Changed");
    await rejectRequest(save, new CellEditError("Temporary save failure"));
    expect(input.value).toBe("Changed");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    await user.click(input);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    await user.click(outside);
    expect(input.value).toBe("Changed");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(input.getAttribute("aria-describedby")!)?.textContent).toContain(
      "Temporary save failure",
    );
    expect(queryErrorTrigger()).not.toBeNull();
    expect(onValueCommitted).toHaveBeenCalledTimes(1);
    await user.click(input);
    rejected = false;
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onValueCommitted).toHaveBeenCalledTimes(2);
    expect(onValueCommitted).toHaveBeenLastCalledWith(ROWS[0], "Changed");
    expect(input.value).toBe("Original");
    expect(input.readOnly).toBe(true);
    expect(input.getAttribute("aria-invalid")).toBeNull();
    expect(queryErrorTrigger()).toBeNull();
  });

  it.each([
    { name: "Tab to the next cell", index: 0, shift: false, outside: false },
    { name: "Shift+Tab to the previous cell", index: 1, shift: true, outside: false },
    { name: "Tab out of the table", index: 1, shift: false, outside: true },
    { name: "Shift+Tab out of the table", index: 0, shift: true, outside: true },
  ])(
    "retains an async commit failure without retrying on $name",
    async ({ index, shift, outside }) => {
      const save = deferred();
      const retry = deferred();
      const onValueCommitted = vi
        .fn()
        .mockImplementationOnce(() => save.promise)
        .mockImplementationOnce(() => retry.promise);
      const { inputs, user } = renderEditor(
        { onValueCommitted },
        { rows: [...ROWS, { id: "2", value: "Second" }] },
      );
      const input = inputs[index];
      change(input);
      await user.keyboard("{Enter}");
      await rejectRequest(save, new CellEditError("Save failed"));
      await screen.findByRole("dialog", { name: "Error in Value" });

      await user.tab({ shift });
      expect(document.activeElement).toBe(
        outside
          ? screen.getByRole("button", { name: shift ? "Before table" : "Outside" })
          : inputs[1 - index],
      );
      expect(onValueCommitted).toHaveBeenCalledTimes(1);
      expect(input.value).toBe("Changed");
      expect(input.getAttribute("aria-invalid")).toBe("true");
      expect(input.closest("td")?.getAttribute("aria-busy")).toBeNull();
      expect(queryErrorTrigger()).not.toBeNull();
      expect(
        document.getElementById(input.getAttribute("aria-describedby")!)?.textContent,
      ).toContain("Save failed");
      expect(screen.queryByRole("dialog")).toBeNull();

      await user.click(input);
      expect(screen.queryByRole("dialog")).toBeNull();
      await user.keyboard("{Alt>}{ArrowDown}{/Alt}");
      const reopened = await screen.findByRole("dialog", { name: "Error in Value" });
      await vi.waitFor(() => expect(reopened.contains(document.activeElement)).toBe(true));
      await user.keyboard("{Escape}");
      await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(input.closest("td")?.contains(document.activeElement)).toBe(true);
      expect(input.value).toBe("Changed");
      await user.click(input);
      await user.keyboard("{Enter}");
      expect(onValueCommitted).toHaveBeenCalledTimes(2);
      expect(input.closest("td")?.getAttribute("aria-busy")).toBe("true");
      await resolveRequest(retry);
      expect(input.getAttribute("aria-invalid")).toBeNull();
      expect(queryErrorTrigger()).toBeNull();
    },
  );

  it.each(["next cell", "outside"] as const)(
    "keeps a synchronous Tab failure's details closed when moving to %s",
    async (destination) => {
      const onValueCommitted = vi.fn(() => {
        throw new CellEditError("Save failed");
      });
      const { input, inputs, user } = renderEditor(
        { onValueCommitted },
        { rows: destination === "next cell" ? [...ROWS, { id: "2", value: "Second" }] : ROWS },
      );
      change(input);

      await user.tab();
      expect(document.activeElement).toBe(
        destination === "next cell" ? inputs[1] : screen.getByRole("button", { name: "Outside" }),
      );
      expect(onValueCommitted).toHaveBeenCalledExactlyOnceWith(ROWS[0], "Changed");
      expect(input.value).toBe("Changed");
      expect(input.getAttribute("aria-invalid")).toBe("true");
      expect(queryErrorTrigger()).not.toBeNull();
      expect(screen.queryByRole("dialog")).toBeNull();
      await user.click(input);
      expect(screen.queryByRole("dialog")).toBeNull();
    },
  );

  it("confirms a changed draft on Tab after an earlier commit failed", async () => {
    const save = deferred();
    const onValueCommitted = vi.fn().mockImplementationOnce(() => save.promise);
    const { input, inputs, user } = renderEditor(
      { onValueCommitted },
      { rows: [...ROWS, { id: "2", value: "Second" }] },
    );
    change(input);
    await user.keyboard("{Enter}");
    await rejectRequest(save, new CellEditError("Save failed"));
    fireEvent.change(input, { target: { value: "Corrected" } });

    await user.tab();
    expect(document.activeElement).toBe(inputs[1]);
    expect(onValueCommitted).toHaveBeenCalledTimes(2);
    expect(onValueCommitted).toHaveBeenLastCalledWith(ROWS[0], "Corrected");
    expect(input.getAttribute("aria-invalid")).toBeNull();
    expect(queryErrorTrigger()).toBeNull();
  });

  it("retains the exact numeric draft rather than its normalized rejected output", () => {
    const onValueCommitted = vi.fn(() => {
      throw new Error("Quantity rejected");
    });
    renderColumn({ id: "value", label: "Value", type: "number", edit: { onValueCommitted } }, [
      { id: "1", value: "12" },
    ]);
    const input = screen.getByRole("textbox", { name: "Value" }) as HTMLInputElement;
    change(input, "１３.５０");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onValueCommitted).toHaveBeenCalledExactlyOnceWith({ id: "1", value: "12" }, 13.5);
    expect(input.value).toBe("１３.５０");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.value).toBe("１３.５０");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.value).toBe("12");
    expect(input.getAttribute("aria-invalid")).toBeNull();
    expect(queryErrorTrigger()).toBeNull();
  });

  it("uses Escape to revert a failed draft and error together to the latest consumer data", () => {
    const onValueChange = vi.fn();
    const onValueCommitted = vi.fn(() => {
      throw new Error("Not accepted");
    });
    const { input, updateRows } = renderEditor({ onValueChange, onValueCommitted });
    change(input);
    fireEvent.keyDown(input, { key: "Enter" });
    const latest = { id: "1", value: "Updated externally" };
    updateRows([latest]);
    expect(input.value).toBe("Changed");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.value).toBe("Changed");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.value).toBe("Updated externally");
    expect(input.readOnly).toBe(true);
    expect(input.getAttribute("aria-invalid")).toBeNull();
    expect(queryErrorTrigger()).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onValueChange).toHaveBeenLastCalledWith(latest, "Updated externally");
    expect(onValueCommitted).toHaveBeenCalledTimes(1);
  });

  it("supports keyboard error inspection, focus return, Tab navigation, and Escape cancellation", async () => {
    const onValueCommitted = vi.fn(() => {
      throw new CellEditError("Not accepted");
    });
    const { input, inputs, user } = renderEditor(
      { onValueCommitted },
      { rows: [...ROWS, { id: "2", value: "Second" }] },
    );
    change(input);
    await user.keyboard("{Enter}");
    expect(input.getAttribute("aria-keyshortcuts")).toBe("Alt+ArrowDown");
    expect(document.getElementById(input.getAttribute("aria-describedby")!)?.textContent).toContain(
      "Press Alt+ArrowDown for error details",
    );
    await user.keyboard("{Alt>}{ArrowDown}{/Alt}");
    const popup = await screen.findByRole("dialog", { name: "Error in Value" });
    expect(within(popup).getByText("Not accepted")).toBeDefined();
    expect(document.activeElement).toBe(popup);
    await user.keyboard("{Escape}");
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await vi.waitFor(() =>
      expect(input.closest("td")?.contains(document.activeElement)).toBe(true),
    );
    expect(input.value).toBe("Changed");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(onValueCommitted).toHaveBeenCalledTimes(1);
    await user.tab();
    expect(document.activeElement).toBe(inputs[1]);
    expect(onValueCommitted).toHaveBeenCalledTimes(1);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(input);
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.keyboard("{Escape}");
    expect(input.value).toBe("Original");
    expect(input.getAttribute("aria-invalid")).toBeNull();
    expect(queryErrorTrigger()).toBeNull();
    expect(onValueCommitted).toHaveBeenCalledTimes(1);
  });

  it("clears cancellation errors and ignores pending results after Escape", async () => {
    const request = deferred();
    const onValueCommitted = vi.fn();
    const { input } = renderEditor({
      onValueChange: (_row, draft) => {
        if (draft === "Original") throw new Error("Even restoring can fail");
        return request.promise;
      },
      onValueCommitted,
    });
    change(input);
    fireEvent.keyDown(input, { key: "Escape" });
    await rejectRequest(request, new Error("Cancelled failure"));
    expect(input.value).toBe("Original");
    expect(queryErrorTrigger()).toBeNull();
    expect(onValueCommitted).not.toHaveBeenCalled();
  });

  it("discards errors on unmount without leaking a late rejection into another cell instance", async () => {
    const request = deferred();
    const view = renderEditor({ onValueChange: () => request.promise, onValueCommitted: noop });
    change(view.input);
    view.unmount();
    const { input } = renderEditor({ onValueCommitted: noop });
    await rejectRequest(request, new Error("Unmounted failure"));
    expect(input.value).toBe("Original");
    expect(queryErrorTrigger()).toBeNull();
  });

  it("keeps failed drafts cell-local and allows Tab navigation without confirming them", () => {
    const onValueCommitted = vi.fn();
    const { inputs } = renderEditor(
      {
        onValueChange: () => {
          throw new Error("Draft failure");
        },
        onValueCommitted,
      },
      { rows: [...ROWS, { id: "2", value: "Second" }] },
    );
    change(inputs[0]);
    expect(inputs[0].getAttribute("aria-invalid")).toBe("true");
    expect(inputs[1].getAttribute("aria-invalid")).toBeNull();
    fireEvent.keyDown(inputs[0], { key: "Tab" });
    expect(onValueCommitted).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(inputs[1]);
    expect(inputs[0].value).toBe("Changed");
    expect(inputs[0].getAttribute("aria-invalid")).toBe("true");
    expect(queryErrorTrigger()).not.toBeNull();
    act(() => inputs[0].focus());
    expect(inputs[0].value).toBe("Changed");
    expect(inputs[0].getAttribute("aria-invalid")).toBe("true");
  });

  it.each(["text", "badge"] as const)(
    "retains a rejected %s choice through error inspection until cancellation",
    async (type) => {
      const onValueCommitted = vi.fn(() => {
        throw new CellEditError("Choice rejected");
      });
      const user = renderColumn({
        id: "value",
        label: "Value",
        type,
        edit: {
          options: [
            { value: "Original", label: "Original" },
            { value: "Changed", label: "Changed" },
          ],
          onValueCommitted,
        },
      });
      const input = screen.getByRole("combobox", { name: "Value" }) as HTMLInputElement;
      await user.click(input);
      await user.click(await screen.findByRole("option", { name: "Changed" }));
      expect(within(await screen.findByRole("dialog")).getByText("Choice rejected")).toBeDefined();
      await user.keyboard("{Escape}");
      await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(input.value).toBe("Changed");
      expect(input.readOnly).toBe(false);
      expect(onValueCommitted).toHaveBeenCalledTimes(1);
      fireEvent.keyDown(input, { key: "Escape" });
      expect(input.value).toBe("Original");
      expect(input.readOnly).toBe(true);
      expect(queryErrorTrigger()).toBeNull();
    },
  );

  it("does not confirm a selected choice until its async change check succeeds", async () => {
    const check = deferred();
    const onValueCommitted = vi.fn();
    const user = renderColumn({
      id: "value",
      label: "Value",
      type: "text",
      edit: {
        options: [
          { value: "Original", label: "Original" },
          { value: "Changed", label: "Changed" },
        ],
        onValueChange: () => check.promise,
        onValueCommitted,
      },
    });
    const input = screen.getByRole("combobox", { name: "Value" }) as HTMLInputElement;
    await user.click(input);
    await user.click(await screen.findByRole("option", { name: "Changed" }));
    expect(input.value).toBe("Changed");
    expect(onValueCommitted).not.toHaveBeenCalled();
    expect(input.closest("td")?.getAttribute("aria-busy")).toBe("true");
    await resolveRequest(check);
    expect(onValueCommitted).toHaveBeenCalledExactlyOnceWith(ROWS[0], "Changed");
    expect(input.value).toBe("Original");
    expect(input.readOnly).toBe(true);
    expect(input.closest("td")?.getAttribute("aria-busy")).toBeNull();
  });

  it("retains a failed date candidate outside its calendar until the edit is reverted", async () => {
    const onValueCommitted = vi.fn(() => {
      throw new Error("Date rejected");
    });
    const user = renderColumn(
      {
        id: "value",
        label: "Value",
        type: "date",
        edit: { onValueCommitted },
      },
      [{ id: "1", value: "2026-10-02" }],
    );
    const trigger = screen.getByRole("button", { name: /^Value/ });
    const initialLabel = trigger.getAttribute("aria-label");
    await user.click(trigger);
    const calendar = document.querySelector<HTMLElement>('[data-slot="data-table-cell-calendar"]')!;
    const day = within(calendar)
      .getAllByRole("button")
      .find((button) => button.textContent === "20" && !button.dataset.outsideMonth)!;
    await user.click(day);
    expect(onValueCommitted).toHaveBeenCalledExactlyOnceWith(
      { id: "1", value: "2026-10-02" },
      "2026-10-20",
    );
    await user.click(document.body);
    expect(trigger.getAttribute("aria-label")).toBe("Value, 2026-10-20");
    expect(trigger.closest("td")?.textContent).toContain("2026-10-20");
    expect(trigger.getAttribute("aria-invalid")).toBe("true");
    await user.click(errorTrigger());
    await screen.findByRole("dialog", { name: "Error in Value" });
    await user.keyboard("{Escape}");
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(trigger.getAttribute("aria-label")).toBe("Value, 2026-10-20");
    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(trigger.getAttribute("aria-label")).toBe(initialLabel);
    expect(trigger.getAttribute("aria-invalid")).toBeNull();
    expect(queryErrorTrigger()).toBeNull();
    expect(onValueCommitted).toHaveBeenCalledTimes(1);
  });

  it("does not bypass a failed date change check by clearing the same draft twice", async () => {
    const onValueChange = vi.fn(() => {
      throw new Error("A date is required");
    });
    const onValueCommitted = vi.fn();
    const user = renderColumn(
      { id: "value", label: "Value", type: "date", edit: { onValueChange, onValueCommitted } },
      [{ id: "1", value: "2026-10-02" }],
    );
    await user.click(screen.getByRole("button", { name: /^Value/ }));
    const clear = screen.getByRole("button", { name: "Clear" });
    await user.click(clear);
    await user.click(clear);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueCommitted).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Value, —" }).getAttribute("aria-invalid")).toBe(
      "true",
    );
  });

  it("waits for the date change check when the same Clear action is repeated", async () => {
    const check = deferred();
    const onValueChange = vi.fn(() => check.promise);
    const onValueCommitted = vi.fn();
    const user = renderColumn(
      { id: "value", label: "Value", type: "date", edit: { onValueChange, onValueCommitted } },
      [{ id: "1", value: "2026-10-02" }],
    );
    await user.click(screen.getByRole("button", { name: /^Value/ }));
    const clear = screen.getByRole("button", { name: "Clear" });
    await user.click(clear);
    await user.click(clear);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueCommitted).not.toHaveBeenCalled();
    await resolveRequest(check);
    expect(onValueCommitted).toHaveBeenCalledExactlyOnceWith(
      { id: "1", value: "2026-10-02" },
      null,
    );
  });

  it("does not duplicate a pending date confirmation when Clear is repeated", async () => {
    const request = deferred();
    const onValueCommitted = vi.fn(() => request.promise);
    const user = renderColumn(
      { id: "value", label: "Value", type: "date", edit: { onValueCommitted } },
      [{ id: "1", value: "2026-10-02" }],
    );
    await user.click(screen.getByRole("button", { name: /^Value/ }));
    const clear = screen.getByRole("button", { name: "Clear" });
    await user.click(clear);
    await user.click(clear);
    expect(onValueCommitted).toHaveBeenCalledTimes(1);
    await rejectRequest(request, new Error("Clear failed"));
    expect(screen.getByRole("button", { name: "Value, —" }).getAttribute("aria-invalid")).toBe(
      "true",
    );
  });

  it("preserves a date-time draft while inspecting its error and clears it on cancellation", async () => {
    const onValueCommitted = vi.fn();
    const user = renderColumn({
      id: "value",
      label: "Value",
      type: "date",
      typeOptions: { dateFormat: "datetime" },
      edit: {
        onValueChange: () => {
          throw new CellEditError("Time rejected");
        },
        onValueCommitted,
      },
    });
    await user.click(screen.getByRole("button", { name: /^Value/ }));
    const time = screen.getByLabelText("Value (Choose time)") as HTMLInputElement;
    fireEvent.change(time, { target: { value: "14:30" } });
    const popup = await screen.findByRole("dialog", { name: "Error in Value" });
    expect(within(popup).getByText("Time rejected")).toBeDefined();
    expect(time.isConnected).toBe(true);
    expect(time.value).toBe("14:30");
    expect(onValueCommitted).not.toHaveBeenCalled();
    await user.keyboard("{Escape}");
    await vi.waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Error in Value" })).toBeNull(),
    );
    expect(time.value).toBe("14:30");
    await user.click(time);
    await user.keyboard("{Escape}");
    expect(queryErrorTrigger()).toBeNull();
    expect(onValueCommitted).not.toHaveBeenCalled();
  });

  it("finishes eagerly and leaves promise failures to the consumer when error:false", async () => {
    const request = deferred();
    const handled = request.promise.catch(noop);
    const onValueCommitted = vi.fn(() => request.promise);
    const { input } = renderEditor({ onValueCommitted, error: false });
    change(input);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onValueCommitted).toHaveBeenCalledExactlyOnceWith(ROWS[0], "Changed");
    expect(input.value).toBe("Original");
    expect(input.readOnly).toBe(true);
    expect(input.closest("td")?.getAttribute("aria-busy")).toBeNull();
    await act(async () => {
      request.reject(new Error("Consumer-owned failure"));
      await handled;
    });
    expect(queryErrorTrigger()).toBeNull();
  });
});

it("types error:false and custom content without empty, true, presentation, or cellContent options", () => {
  const disabled: TextCellEditOptions<Row> = { onValueCommitted: noop, error: false };
  const custom: TextCellEditOptions<Row> = {
    onValueCommitted: async (_row, value) => {
      expectTypeOf(value).toEqualTypeOf<string | null>();
    },
    error: {
      render: (ctx) => {
        expectTypeOf(ctx.row).toEqualTypeOf<Row>();
        expectTypeOf(ctx.error).toEqualTypeOf<unknown>();
        // @ts-expect-error — inline presentation is not part of this API
        expect(ctx.cellContent).toBeUndefined();
        return <p>Custom error</p>;
      },
    },
  };
  const empty: TextCellEditOptions<Row> = {
    onValueCommitted: noop,
    // @ts-expect-error — custom settings require render
    error: {},
  };
  const enabled: TextCellEditOptions<Row> = {
    onValueCommitted: noop,
    // @ts-expect-error — standard errors are enabled by default, not error:true
    error: true,
  };
  const presentation: TextCellEditOptions<Row> = {
    onValueCommitted: noop,
    error: {
      // @ts-expect-error — only popover presentation is supported, with no type option
      type: "inline",
      render: () => "ERROR",
    },
  };
  expect(disabled.error).toBe(false);
  expect(custom.error).toBeDefined();
  expect(empty.error).toEqual({});
  expect(enabled.error).toBe(true);
  expect(presentation.error).toBeDefined();
});
