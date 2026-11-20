import { StrictMode, Suspense } from "react";
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { AppShellConfigContext, buildConfigurations } from "@/contexts/appshell-context";
import { CellEditError } from "@/components/internals/table-core/cell-edit-error";
import { LineItems } from "./line-items";
import { getLineItemsEditing } from "./editing";
import { useLineItems } from "./use-line-items";
import type { LineItemsChangeset, LineItemsColumn, UseLineItemsReturn } from "./types";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

type Row = { id?: string; name: string | null; quantity: number | null; notes?: string };
const rows: Row[] = [
  { id: "A", name: "Widget", quantity: 2, notes: "Keep" },
  { id: "B", name: "Other", quantity: 3 },
];
const empty = { added: [], updated: [], removed: [], order: null };
const nameColumn = {
  accessorKey: "name",
  label: "Name",
  edit: { editorType: "text" },
} satisfies LineItemsColumn<Row>;
const quantityColumn = {
  accessorKey: "quantity",
  label: "Quantity",
  edit: { editorType: "number" },
} satisfies LineItemsColumn<Row>;
const configurations = buildConfigurations({ modules: [], locale: "en", timeZone: "Asia/Tokyo" });

function setup(columns: LineItemsColumn<Row>[] = [nameColumn, quantityColumn]) {
  let value!: UseLineItemsReturn<Row>;
  function Owner({
    show = true,
    config = columns,
  }: {
    show?: boolean;
    config?: LineItemsColumn<Row>[];
  }) {
    value = useLineItems({ columns: config, defaultLines: rows, orderer: true });
    return (
      <MemoryRouter>
        <AppShellConfigContext.Provider value={{ configurations }}>
          <LineItems.Root value={value}>
            {show && <LineItems.Table aria-label="Lines" />}
          </LineItems.Root>
        </AppShellConfigContext.Provider>
      </MemoryRouter>
    );
  }
  const view = render(<Owner />, { wrapper: StrictMode });
  return {
    ...view,
    get value() {
      return value;
    },
    update: (show = true, config = columns) => view.rerender(<Owner show={show} config={config} />),
  };
}
const input = (label = "Name", index = 1) =>
  screen.getByRole("textbox", { name: `${label}, Row ${index}` }) as HTMLInputElement;
function draft(control: HTMLInputElement, text: string) {
  act(() => control.focus());
  fireEvent.change(control, { target: { value: text } });
}
function deferred() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((success, failure) => {
    resolve = success;
    reject = failure;
  });
  return { promise, resolve, reject };
}
async function prepare(value: UseLineItemsReturn<Row>): Promise<LineItemsChangeset<Row> | null> {
  let changes: LineItemsChangeset<Row> | null = null;
  await act(async () => {
    changes = await value.commitChanges();
  });
  return changes;
}

describe("LineItems save lifecycle", () => {
  it("returns committed changes from a focused draft and keeps the lock until finishSave", async () => {
    const editor = setup();
    draft(input(), "Changed");
    expect(editor.value.getChanges()).toEqual(empty);
    const changes = await prepare(editor.value);
    expect(changes?.updated).toEqual([{ lineKey: "A", changes: { name: "Changed" } }]);
    expect(editor.value.lines[0].name).toBe("Changed");
    expect(editor.value.isSaveLocked).toBe(true);
    expect(input().readOnly).toBe(true);
    expect(
      screen.getByRole("table").closest('[data-slot="line-items"]')?.getAttribute("aria-busy"),
    ).toBe("true");
    act(() => editor.value.finishSave());
    expect(editor.value.isSaveLocked).toBe(false);
    expect(input().getAttribute("aria-disabled")).toBeNull();
    fireEvent.mouseDown(input());
    expect(input().readOnly).toBe(false);
    expect(editor.value.getChanges()).toEqual(changes);
  });

  it("distinguishes successful empty changes from rejected preparation", async () => {
    const editor = setup();
    act(() => input().focus());
    expect(await prepare(editor.value)).toEqual(empty);
    expect(editor.value.isSaveLocked).toBe(true);
    act(() => editor.value.finishSave());
    draft(input("Quantity"), "-");
    expect(await prepare(editor.value)).toBeNull();
    expect(input("Quantity").value).toBe("-");
    expect(input("Quantity").getAttribute("aria-invalid")).toBe("true");
    expect(editor.value.isSaveLocked).toBe(false);
  });

  it("awaits in-flight validation without running the callback twice", async () => {
    const request = deferred();
    const check = vi.fn(() => request.promise);
    const editor = setup([
      { ...nameColumn, edit: { ...nameColumn.edit, onValueCommitted: check } },
    ]);
    draft(input(), "Changed");
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(check).toHaveBeenCalledTimes(1);
    let pending!: Promise<LineItemsChangeset<Row> | null>;
    act(() => {
      pending = editor.value.commitChanges();
    });
    expect(editor.value.isSaveLocked).toBe(true);
    expect(editor.value.getChanges()).toEqual(empty);
    expect(input().value).toBe("Changed");
    let settled = false;
    void pending.then(() => {
      settled = true;
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(settled).toBe(false);
    await act(async () => {
      request.resolve();
      await pending;
    });
    expect(check).toHaveBeenCalledTimes(1);
    expect((await pending)?.updated).toEqual([{ lineKey: "A", changes: { name: "Changed" } }]);
    expect(editor.value.isSaveLocked).toBe(true);
  });

  it("locks synchronously against retained commands and preserves input during preparation", async () => {
    const request = deferred();
    const editor = setup([
      { ...nameColumn, edit: { ...nameColumn.edit, onValueCommitted: () => request.promise } },
    ]);
    const retained = editor.value;
    const control = input();
    const key = retained.getLineKey(retained.lines[0]);
    draft(control, "Changed");
    let pending!: Promise<LineItemsChangeset<Row> | null>;
    act(() => {
      pending = retained.commitChanges();
      expect(() => retained.updateField(key, "name", "Overwrite")).toThrow("locked for saving");
      expect(() => retained.addLine({ name: "New", quantity: 1 })).toThrow("locked for saving");
      expect(() => retained.removeLine(key)).toThrow("locked for saving");
      expect(() => retained.reorderLine(key, "B")).toThrow("locked for saving");
      expect(() => retained.revert()).toThrow("locked for saving");
      expect(() => retained.finishSave()).toThrow("during cell preparation");
      expect(() => retained.replaceLines(rows)).toThrow("during cell preparation");
    });
    fireEvent.change(control, { target: { value: "Overwrite" } });
    fireEvent.keyDown(control, { key: "Escape" });
    const session = getLineItemsEditing<Row>(retained).getSession(retained.lines[0], nameColumn);
    expect(session.getState()).toMatchObject({ draft: "Changed" });
    expect(
      screen.getByRole("button", { name: "Reorder line 1" }).getAttribute("aria-disabled"),
    ).toBe("true");
    expect(screen.getByRole("button", { name: "Reorder line 1" }).getAttribute("draggable")).toBe(
      "false",
    );
    await act(async () => {
      request.resolve();
      await pending;
    });
    expect(editor.value.lines[0].name).toBe("Changed");
    expect(() => retained.revert()).toThrow("locked for saving");
    act(() => retained.finishSave());
    act(() => retained.revert());
    expect(editor.value.lines[0].name).toBe("Widget");
  });

  it("rejects concurrent preparation without unlocking the first attempt", async () => {
    const request = deferred();
    const editor = setup([
      { ...nameColumn, edit: { ...nameColumn.edit, onValueCommitted: () => request.promise } },
    ]);
    draft(input(), "Changed");
    let first!: Promise<LineItemsChangeset<Row> | null>;
    await act(async () => {
      first = editor.value.commitChanges();
      await expect(editor.value.commitChanges()).rejects.toThrow("locked for saving");
    });
    expect(editor.value.isSaveLocked).toBe(true);
    await act(async () => {
      request.resolve();
      await first;
    });
    await expect(editor.value.commitChanges()).rejects.toThrow("locked for saving");
  });

  it("keeps partial successful commits and rejected drafts, then retries", async () => {
    const check = vi.fn((_row: Readonly<Row>, value: number | null) => {
      if (value === null || value <= 0) throw new CellEditError("Positive only");
    });
    const editor = setup([
      nameColumn,
      { ...quantityColumn, edit: { ...quantityColumn.edit, onValueCommitted: check } },
    ]);
    draft(input("Quantity"), "0");
    draft(input(), "Changed");
    expect(await prepare(editor.value)).toBeNull();
    expect(editor.value.lines[0]).toMatchObject({ name: "Changed", quantity: 2 });
    expect(input("Quantity").value).toBe("0");
    expect(editor.value.getChanges().updated).toEqual([
      { lineKey: "A", changes: { name: "Changed" } },
    ]);
    expect(editor.value.isSaveLocked).toBe(false);
    draft(input("Quantity"), "5");
    const changes = await prepare(editor.value);
    expect(changes?.updated).toEqual([{ lineKey: "A", changes: { name: "Changed", quantity: 5 } }]);
  });

  it("retains malformed numeric input on blur and permits correction", async () => {
    const editor = setup();
    draft(input("Quantity"), "-");
    act(() => input("Quantity").blur());
    expect(input("Quantity").value).toBe("-");
    expect(await prepare(editor.value)).toBeNull();
    expect(editor.value.lines[0].quantity).toBe(2);
    draft(input("Quantity"), "4");
    expect((await prepare(editor.value))?.updated).toEqual([
      { lineKey: "A", changes: { quantity: 4 } },
    ]);
  });

  it("confirms retained drafts after the table view detaches", async () => {
    const editor = setup();
    draft(input(), "Detached");
    editor.update(false);
    expect(await prepare(editor.value)).toMatchObject({
      updated: [{ lineKey: "A", changes: { name: "Detached" } }],
    });
    expect(editor.value.isSaveLocked).toBe(true);
    editor.update(true);
    expect(input().value).toBe("Detached");
    expect(input().readOnly).toBe(true);
  });

  it("settles an unmounted preparation without adopting late validation", async () => {
    const request = deferred();
    const editor = setup([
      { ...nameColumn, edit: { ...nameColumn.edit, onValueCommitted: () => request.promise } },
    ]);
    draft(input(), "Late");
    const retained = editor.value;
    let pending!: Promise<LineItemsChangeset<Row> | null>;
    act(() => {
      pending = retained.commitChanges();
    });
    editor.unmount();
    expect(await pending).toBeNull();
    await act(async () => {
      request.resolve();
      await request.promise;
    });
    expect(retained.getChanges()).toEqual(empty);
    expect(() => retained.replaceLines(rows)).toThrow("no longer active");
    expect(() => retained.finishSave()).not.toThrow();
  });

  it("preserves a successful save lock and permits acknowledgment through Suspense hide/reveal", async () => {
    const waiting = new Promise<never>(() => {});
    let value!: UseLineItemsReturn<Row>;
    function Owner({ suspend }: { suspend: boolean }) {
      value = useLineItems({ columns: [nameColumn], defaultLines: rows });
      if (suspend) throw waiting;
      return null;
    }
    const view = render(
      <Suspense fallback={null}>
        <Owner suspend={false} />
      </Suspense>,
    );
    act(() => value.updateField("A", "name", "Saved"));
    await prepare(value);
    const retained = value;
    view.rerender(
      <Suspense fallback={null}>
        <Owner suspend />
      </Suspense>,
    );
    expect(getLineItemsEditing<Row>(retained).isSaveLocked()).toBe(true);
    expect(() => retained.updateField("A", "name", "During save")).toThrow("locked for saving");
    act(() => retained.replaceLines([{ id: "A", name: "Confirmed", quantity: 2 }]));
    view.rerender(
      <Suspense fallback={null}>
        <Owner suspend={false} />
      </Suspense>,
    );
    expect(value.isSaveLocked).toBe(true);
    expect(value.lines[0].name).toBe("Confirmed");
    act(() => retained.finishSave());
    expect(value.isSaveLocked).toBe(false);
    expect(value.getChanges()).toEqual(empty);
  });

  it("rejects ambiguous sibling drafts without erasing rejected input", async () => {
    const editor = setup([
      { ...nameColumn, id: "primary", label: "Primary" },
      { ...nameColumn, id: "duplicate", label: "Duplicate" },
    ]);
    const editing = getLineItemsEditing<Row>(editor.value);
    const row = editor.value.lines[0];
    act(() => {
      editing.getSession(row, editor.value.columns[0]).change("Valid");
      const rejected = editing.getSession(row, editor.value.columns[1]);
      rejected.change("Rejected");
      rejected.fail(new Error("Invalid draft"), "parse");
    });
    await act(async () => {
      await expect(editor.value.commitChanges()).rejects.toThrow("duplicate-property drafts");
    });
    expect(editor.value.isSaveLocked).toBe(false);
    expect(editor.value.getChanges()).toEqual(empty);
    expect(editing.getSession(row, editor.value.columns[0]).getState()).toMatchObject({
      draft: "Valid",
    });
    expect(editing.getSession(row, editor.value.columns[1]).getFailure()).toMatchObject({
      draft: "Rejected",
    });
    act(() => editing.getSession(row, editor.value.columns[1]).cancel());
    expect((await prepare(editor.value))?.updated).toEqual([
      { lineKey: "A", changes: { name: "Valid" } },
    ]);
  });

  it("releases the lock when a missing internal confirmation handler throws", async () => {
    const { result } = renderHook(() =>
      useLineItems({ columns: [nameColumn], defaultLines: rows }),
    );
    const editing = getLineItemsEditing<Row>(result.current);
    editing.getSession(result.current.lines[0], nameColumn).begin("Unrendered");
    await act(async () => {
      await expect(result.current.commitChanges()).rejects.toThrow("no confirmation handler");
    });
    expect(result.current.isSaveLocked).toBe(false);
    expect(result.current.getChanges()).toEqual(empty);
  });

  it("uses the committed comparison configuration for save preparation", async () => {
    const editor = setup([
      {
        ...nameColumn,
        equals: (base: Row["name"], current: Row["name"]) =>
          base?.toLowerCase() === current?.toLowerCase(),
      },
    ]);
    draft(input(), "WIDGET");
    expect(await prepare(editor.value)).toEqual(empty);
    expect(editor.value.lines[0].name).toBe("WIDGET");
    expect(editor.value.isDirty).toBe(false);
  });

  it("retains changes and the old baseline on persistence failure", async () => {
    const editor = setup();
    draft(input(), "Changed");
    const changes = await prepare(editor.value);
    expect(changes).not.toBeNull();
    act(() => editor.value.finishSave());
    expect(editor.value.getChanges()).toEqual(changes);
    act(() => editor.value.revert());
    expect(editor.value.lines[0].name).toBe("Widget");
    expect(editor.value.isDirty).toBe(false);
  });

  it("adopts confirmed identities and uses the new baseline on subsequent edits and discard", async () => {
    const editor = setup();
    let creation!: string;
    act(() => {
      creation = editor.value.addLine({ name: "New", quantity: 1 });
    });
    expect((await prepare(editor.value))?.added).toMatchObject([{ name: "New" }]);
    act(() => editor.value.replaceLines([...rows, { id: "C", name: "Confirmed", quantity: 1 }]));
    expect(editor.value.isSaveLocked).toBe(true);
    expect(editor.value.isDirty).toBe(false);
    expect(editor.value.getChanges()).toEqual(empty);
    act(() => editor.value.finishSave());
    expect(() => editor.value.removeLine(creation)).toThrow("Unknown line");
    draft(input("Name", 3), "Changed again");
    expect((await prepare(editor.value))?.updated).toEqual([
      { lineKey: "C", changes: { name: "Changed again" } },
    ]);
    act(() => editor.value.finishSave());
    act(() => editor.value.revert());
    expect(editor.value.lines[2].name).toBe("Confirmed");
    act(() => editor.value.removeLine("C"));
    expect(editor.value.getChanges().added).toEqual([]);
    expect(editor.value.getChanges().removed).toMatchObject([{ id: "C", name: "Confirmed" }]);
  });

  it("invalidates obsolete draft validation before publishing replacement data", async () => {
    const request = deferred();
    const editor = setup([
      { ...nameColumn, edit: { ...nameColumn.edit, onValueCommitted: () => request.promise } },
    ]);
    draft(input(), "Late");
    fireEvent.keyDown(input(), { key: "Enter" });
    act(() => editor.value.replaceLines([{ id: "A", name: "Confirmed", quantity: 7 }]));
    expect(input().value).toBe("Confirmed");
    await act(async () => {
      request.resolve();
      await request.promise;
    });
    expect(editor.value.lines[0].name).toBe("Confirmed");
    expect(editor.value.getChanges()).toEqual(empty);
  });

  it("rejects invalid replacement without losing retained drafts or the save lock", async () => {
    const editor = setup();
    draft(input(), "Changed");
    await prepare(editor.value);
    const before = editor.value.lines;
    expect(() => editor.value.replaceLines([{ name: "Missing ID", quantity: 1 }])).toThrow(
      "persisted IDs",
    );
    expect(editor.value.lines).toBe(before);
    expect(editor.value.isSaveLocked).toBe(true);
    act(() => editor.value.finishSave());
    draft(input(), "Still pending");
    expect(() => editor.value.replaceLines([{ name: "Missing ID", quantity: 1 }])).toThrow(
      "persisted IDs",
    );
    expect(input().value).toBe("Still pending");
    expect((await prepare(editor.value))?.updated).toEqual([
      { lineKey: "A", changes: { name: "Still pending" } },
    ]);
  });

  it("allows confirmed empty replacement and preserves explicit clears", async () => {
    const editor = setup([
      {
        accessorKey: "notes",
        label: "Notes",
        edit: { editorType: "text", clearValue: () => undefined },
      },
    ]);
    draft(input("Notes"), "");
    const changes = await prepare(editor.value);
    expect(changes?.updated[0].changes).toEqual({ notes: undefined });
    expect(Object.hasOwn(changes!.updated[0].changes, "notes")).toBe(true);
    act(() => editor.value.replaceLines([]));
    expect(editor.value.lines).toEqual([]);
    expect(editor.value.getChanges()).toEqual(empty);
    act(() => editor.value.finishSave());
    act(() => editor.value.revert());
    expect(editor.value.lines).toEqual([]);
  });
});
