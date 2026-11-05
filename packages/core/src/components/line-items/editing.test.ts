import { describe, expect, it, vi } from "vitest";
import { createLineItemsDocumentStore } from "./document-store";
import { createLineItemsEditing } from "./editing";
import type { LineItemsColumn } from "./types";

type Row = { id?: string; name: string | null; quantity: number | null };
function deferred() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((success, failure) => {
    resolve = success;
    reject = failure;
  });
  return { promise, resolve, reject };
}
function setup(
  check?: (row: Readonly<Row>, value: string | null) => void | Promise<void>,
  error?: false,
) {
  const columns: LineItemsColumn<Row>[] = [
    {
      accessorKey: "name",
      label: "Name",
      edit: { editorType: "text", onValueCommitted: check, error },
    },
    { accessorKey: "quantity" },
  ];
  const store = createLineItemsDocumentStore({
    columns,
    lines: [{ id: "A", name: "First", quantity: 1 }],
  });
  const editing = createLineItemsEditing(store, columns);
  const session = editing.getSession(store.getSnapshot()[0], columns[0]);
  const confirm = (value: string) => {
    session.change(value);
    return session.confirm(() => editing.commitField("A", "name", value));
  };
  return { columns, store, editing, session, confirm };
}

describe("document-owned cell editing", () => {
  it("adopts a successful check into the current row without overwriting unrelated changes", async () => {
    const request = deferred();
    const check = vi.fn(() => request.promise);
    const { editing, store, confirm } = setup(check);
    const listener = vi.fn();
    store.subscribe(listener);
    const result = confirm("Confirmed");
    expect(store.getSnapshot()[0].name).toBe("First");
    editing.updateField("A", "quantity", 2);
    request.resolve();
    await expect(result).resolves.toBe(true);
    expect(store.getSnapshot()[0]).toMatchObject({ name: "Confirmed", quantity: 2 });
    expect(check).toHaveBeenCalledWith(
      expect.objectContaining({ name: "First", quantity: 1 }),
      "Confirmed",
    );
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it.each([
    "update",
    "noop-update",
    "remove",
    "revert",
    "dispose",
    "callback",
    "permission",
  ] as const)("prevents late adoption after %s invalidates the logical edit", async (action) => {
    const request = deferred();
    const { columns, editing, store, session, confirm } = setup(() => request.promise);
    const pending = confirm("Stale");
    if (action === "update") editing.updateField("A", "name", "Command");
    if (action === "noop-update") editing.updateField("A", "name", "First");
    if (action === "remove") editing.removeLine("A");
    if (action === "revert") editing.revert();
    if (action === "dispose") editing.deactivate();
    if (action === "callback" || action === "permission") {
      editing.setColumns([
        {
          accessorKey: "name",
          edit: {
            editorType: "text",
            onValueCommitted: action === "callback" ? () => {} : () => request.promise,
            canEdit: action === "permission" ? () => false : undefined,
          },
        },
        columns[1],
      ]);
    }
    const snapshot = store.getSnapshot();
    await expect(pending).resolves.toBe(false);
    request.resolve();
    await request.promise;
    await Promise.resolve();
    expect(store.getSnapshot()).toBe(snapshot);
    if (action !== "dispose" && action !== "remove")
      expect(session.getState()).toEqual({ status: "idle" });
    const expectedName = action === "update" ? "Command" : "First";
    expect(store.getSnapshot().map((row) => row.name)).toEqual(
      action === "remove" ? [] : [expectedName],
    );
  });

  it("retains a rejected callback draft without adopting data or publishing a row snapshot", async () => {
    const request = deferred();
    const { confirm, store, session } = setup(() => request.promise);
    const initial = store.getSnapshot();
    const listener = vi.fn();
    store.subscribe(listener);
    const result = confirm("Rejected");
    const error = new Error("Rejected");
    request.reject(error);
    await expect(result).resolves.toBe(false);
    expect(session.getFailure()).toMatchObject({ error, source: "commit", draft: "Rejected" });
    expect(store.getSnapshot()).toBe(initial);
    expect(listener).not.toHaveBeenCalled();
  });

  it("does not discard a draft for an invalid programmatic write", () => {
    const { editing, session } = setup();
    session.begin("Retained");
    const draft = session.getState();
    expect(() => editing.updateField("A", "id", "Changed")).toThrow("save acknowledgment");
    expect(session.getState()).toBe(draft);
  });

  it("preserves a draft on display-only configuration changes", () => {
    const { columns, editing, session } = setup();
    session.begin("Retained");
    const draft = session.getState();
    editing.setColumns([
      { ...columns[0], label: "Renamed", render: (row) => row.name },
      columns[1],
    ]);
    expect(session.getState()).toBe(draft);
  });

  it("preserves DataTable's eager opt-out and callback propagation", () => {
    const error = new Error("Caller-owned");
    const { confirm, store, session } = setup(() => {
      throw error;
    }, false);
    expect(() => confirm("Eager")).toThrow(error);
    expect(store.getSnapshot()[0].name).toBe("Eager");
    expect(session.getState()).toEqual({ status: "idle" });
  });

  it("rejects editors on the server identity property", () => {
    const columns: LineItemsColumn<{ id: string | null }>[] = [
      { accessorKey: "id", edit: { editorType: "text" } },
    ];
    const store = createLineItemsDocumentStore({ columns });
    expect(() => createLineItemsEditing(store, columns)).toThrow(
      "Line IDs cannot have cell editors",
    );
  });
});
