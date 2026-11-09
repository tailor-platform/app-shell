import { describe, expect, it, vi } from "vitest";
import { createLineItemsDocumentStore } from "./document/store";
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
    session.confirm(() => editing.commitField("A", "name", value));
  };
  return { columns, store, editing, session, confirm };
}

describe("document-owned cell editing", () => {
  it("adopts a successful check into the current row without overwriting unrelated changes", async () => {
    const request = deferred();
    const check = vi.fn(() => request.promise);
    const { editing, store, session, confirm } = setup(check);
    const listener = vi.fn();
    store.subscribe(listener);
    confirm("Confirmed");
    expect(store.getSnapshot()[0].name).toBe("First");
    editing.updateField("A", "quantity", 2);
    request.resolve();
    await request.promise;
    await Promise.resolve();
    expect(session.getState()).toEqual({ status: "idle" });
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
    "options",
  ] as const)("prevents late adoption after %s invalidates the logical edit", async (action) => {
    const request = deferred();
    const check = () => request.promise;
    const { columns, editing, store, session, confirm } = setup(check);
    confirm("Stale");
    if (action === "update") editing.updateField("A", "name", "Command");
    if (action === "noop-update") editing.updateField("A", "name", "First");
    if (action === "remove") editing.removeLine("A");
    if (action === "revert") editing.revert();
    if (action === "dispose") editing.deactivate();
    if (action === "callback" || action === "permission" || action === "options") {
      editing.setColumns([
        {
          accessorKey: "name",
          edit:
            action === "options"
              ? {
                  editorType: "combobox",
                  options: [{ value: "New", label: "New" }],
                  onValueCommitted: check,
                }
              : {
                  editorType: "text",
                  onValueCommitted: action === "callback" ? () => {} : check,
                  canEdit: action === "permission" ? () => false : undefined,
                },
        },
        columns[1],
      ]);
    }
    const snapshot = store.getSnapshot();
    request.resolve();
    await request.promise;
    await Promise.resolve();
    expect(store.getSnapshot()).toBe(snapshot);
    if (action !== "dispose" && action !== "remove")
      expect(session.getState()).toEqual({ status: "idle" });
    expect(store.getSnapshot().map((row) => row.name)).toEqual(
      action === "remove" ? [] : [action === "update" ? "Command" : "First"],
    );
  });

  it("retains a rejected callback draft without adopting data or publishing a row snapshot", async () => {
    const request = deferred();
    const { confirm, store, session } = setup(() => request.promise);
    const initial = store.getSnapshot();
    const listener = vi.fn();
    store.subscribe(listener);
    confirm("Rejected");
    const error = new Error("Rejected");
    request.reject(error);
    await request.promise.catch(() => {});
    await Promise.resolve();
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

  it("clears sibling drafts for duplicate columns owning the same property", () => {
    const { columns, editing, store, confirm } = setup();
    const duplicate = { ...columns[0], id: "duplicate" };
    editing.setColumns([...columns, duplicate]);
    const sibling = editing.getSession(store.getSnapshot()[0], duplicate);
    sibling.begin("Other draft");
    confirm("Confirmed");
    expect(sibling.getState()).toEqual({ status: "idle" });
    expect(store.getSnapshot()[0].name).toBe("Confirmed");
  });

  it("preserves eager opt-out and callback propagation", () => {
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
