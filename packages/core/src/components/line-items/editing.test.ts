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
  error?: NonNullable<LineItemsColumn<Row>["edit"]>["error"],
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
  it("indexes each snapshot once when reconciling retained cells and purging removed rows", () => {
    const columns: LineItemsColumn<Row>[] = Array.from({ length: 5 }, (_, index) => ({
      id: `name-${index}`,
      accessorKey: "name",
      edit: { editorType: "text" },
    }));
    const store = createLineItemsDocumentStore({
      columns,
      lines: Array.from({ length: 1_000 }, (_, index) => ({
        id: String(index),
        name: "Item",
        quantity: 1,
      })),
    });
    const getLineKey = vi.spyOn(store, "getLineKey");
    const editing = createLineItemsEditing(store, columns);
    for (const row of store.getSnapshot())
      for (const column of columns) editing.getSession(row, column);
    getLineKey.mockClear();

    editing.reconcileColumns(columns);
    expect(getLineKey).toHaveBeenCalledTimes(1_000);
    getLineKey.mockClear();
    editing.reconcileColumns(columns);
    expect(getLineKey).not.toHaveBeenCalled();

    editing.removeLine("999");
    expect(getLineKey).toHaveBeenCalledTimes(999);
    getLineKey.mockClear();
    editing.reconcileColumns(columns);
    expect(getLineKey).not.toHaveBeenCalled();
  });

  it.each(["update", "add", "reorder", "remove", "revert"] as const)(
    "reads current rows after a document %s changes the snapshot",
    (action) => {
      const { columns, store, editing } = setup();
      const canEdit = vi.fn((_row: Row) => true);
      const editable: LineItemsColumn<Row>[] = [
        { accessorKey: "name", edit: { editorType: "text", canEdit } },
        columns[1],
      ];
      const addedKey = store.addLine({ name: "Added", quantity: 2 });
      editing.getSession(store.getSnapshot()[1], editable[0]);
      editing.reconcileColumns(editable);
      canEdit.mockClear();

      if (action === "update") store.updateField("A", "quantity", 3);
      if (action === "add") {
        store.addLine({ name: "Another", quantity: 4 });
        editing.getSession(store.getSnapshot()[2], editable[0]);
      }
      if (action === "reorder") store.reorderLine(addedKey, null);
      if (action === "remove") editing.removeLine(addedKey);
      if (action === "revert") editing.revert();
      editing.reconcileColumns(editable);

      expect(canEdit).toHaveBeenCalledTimes(store.getSnapshot().length);
      for (const row of store.getSnapshot()) {
        const checked = canEdit.mock.calls.find(
          ([candidate]) => store.getLineKey(candidate) === store.getLineKey(row),
        );
        expect(checked?.[0]).toBe(row);
      }
    },
  );

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
    "permission",
    "editor-removed",
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
    if (action === "permission" || action === "editor-removed") {
      editing.reconcileColumns([
        {
          accessorKey: "name",
          edit:
            action === "editor-removed"
              ? undefined
              : { editorType: "text", onValueCommitted: check, canEdit: () => false },
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

  it("retains an in-flight check when callbacks are recreated and uses the latest callback next time", async () => {
    const request = deferred();
    const before = vi.fn(() => request.promise);
    const after = vi.fn();
    const { columns, editing, store, session, confirm } = setup(before);
    confirm("Pending");
    const pending = session.getState();
    editing.reconcileColumns([
      { accessorKey: "name", edit: { editorType: "text", onValueCommitted: after } },
      columns[1],
    ]);
    expect(session.getState()).toBe(pending);
    request.resolve();
    await request.promise;
    await Promise.resolve();
    expect(store.getSnapshot()[0].name).toBe("Pending");
    expect(before).toHaveBeenCalledTimes(1);
    expect(after).not.toHaveBeenCalled();
    confirm("Next");
    expect(store.getSnapshot()[0].name).toBe("Next");
    expect(after).toHaveBeenCalledWith(expect.objectContaining({ name: "Pending" }), "Next");
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

  it("validates proposed columns without changing drafts or committed callbacks", () => {
    const before = vi.fn();
    const after = vi.fn();
    const { columns, editing, store, session, confirm } = setup(before);
    session.begin("Retained");
    const draft = session.getState();
    const snapshot = store.getSnapshot();
    editing.assertColumns([{ accessorKey: "name" }, columns[1]]);
    editing.assertColumns([
      { accessorKey: "name", edit: { editorType: "text", onValueCommitted: after } },
      columns[1],
    ]);
    expect(() => editing.assertColumns([])).toThrow("change document property ownership");
    expect(session.getState()).toBe(draft);
    expect(store.getSnapshot()).toBe(snapshot);
    confirm("Confirmed");
    expect(before).toHaveBeenCalledWith(snapshot[0], "Confirmed");
    expect(after).not.toHaveBeenCalled();
  });

  it("rejects invalid reconciliation without changing drafts or committed callbacks", () => {
    const check = vi.fn();
    const { editing, store, session, confirm } = setup(check);
    session.begin("Retained");
    const draft = session.getState();
    const snapshot = store.getSnapshot();
    expect(() => editing.reconcileColumns([])).toThrow("change document property ownership");
    expect(session.getState()).toBe(draft);
    expect(store.getSnapshot()).toBe(snapshot);
    confirm("Confirmed");
    expect(check).toHaveBeenCalledWith(snapshot[0], "Confirmed");
  });

  it("preserves a draft on display-only configuration changes", () => {
    const { columns, editing, session } = setup();
    session.begin("Retained");
    const draft = session.getState();
    editing.reconcileColumns([
      { ...columns[0], label: "Renamed", render: (row) => row.name },
      columns[1],
    ]);
    expect(session.getState()).toBe(draft);
  });

  it("clears sibling drafts for duplicate columns owning the same property", () => {
    const { columns, editing, store, confirm } = setup();
    const duplicate = { ...columns[0], id: "duplicate" };
    editing.reconcileColumns([...columns, duplicate]);
    const sibling = editing.getSession(store.getSnapshot()[0], duplicate);
    sibling.begin("Other draft");
    confirm("Confirmed");
    expect(sibling.getState()).toEqual({ status: "idle" });
    expect(store.getSnapshot()[0].name).toBe("Confirmed");
  });

  describe.each(["default", "custom"] as const)("%s error presentation", (presentation) => {
    const errorOptions = presentation === "custom" ? { render: () => null } : undefined;

    it("retains synchronous rejection without adopting or publishing a snapshot", () => {
      const error = new Error("Rejected");
      const check = vi.fn(() => {
        throw error;
      });
      const { confirm, store, session } = setup(check, errorOptions);
      const initial = store.getSnapshot();
      const listener = vi.fn();
      store.subscribe(listener);

      expect(() => confirm("Rejected")).not.toThrow();

      expect(session.getFailure()).toMatchObject({ error, source: "commit", draft: "Rejected" });
      expect(store.getSnapshot()).toBe(initial);
      expect(store.isDirty()).toBe(false);
      expect(listener).not.toHaveBeenCalled();
      expect(check).toHaveBeenCalledTimes(1);
    });

    it.each(["resolve", "reject"] as const)(
      "waits before adoption when a pending check will %s and does not repeat it",
      async (outcome) => {
        const request = deferred();
        const check = vi.fn(() => request.promise);
        const { confirm, editing, store, session } = setup(check, errorOptions);
        const initial = store.getSnapshot();
        const listener = vi.fn();
        store.subscribe(listener);
        confirm("Candidate");
        session.confirm(() => editing.commitField("A", "name", "Candidate"));

        expect(session.getState()).toEqual({ status: "confirming", draft: "Candidate" });
        expect(store.getSnapshot()).toBe(initial);
        expect(store.isDirty()).toBe(false);
        expect(listener).not.toHaveBeenCalled();
        expect(check).toHaveBeenCalledExactlyOnceWith(initial[0], "Candidate");

        const error = new Error("Rejected");
        if (outcome === "resolve") request.resolve();
        else request.reject(error);
        await request.promise.catch(() => {});
        await Promise.resolve();

        if (outcome === "resolve") {
          expect(session.getState()).toEqual({ status: "idle" });
          expect(store.getSnapshot()[0].name).toBe("Candidate");
          expect(store.isDirty()).toBe(true);
          expect(listener).toHaveBeenCalledTimes(1);
        } else {
          expect(session.getFailure()).toMatchObject({
            error,
            source: "commit",
            draft: "Candidate",
          });
          expect(store.getSnapshot()).toBe(initial);
          expect(store.isDirty()).toBe(false);
          expect(listener).not.toHaveBeenCalled();
        }
        expect(check).toHaveBeenCalledTimes(1);
      },
    );
  });

  it("rejects disabled error handling from untyped configuration", () => {
    const columns = [
      { accessorKey: "name", edit: { editorType: "text", error: false } },
    ] as unknown as LineItemsColumn<Row>[];
    expect(() => createLineItemsDocumentStore({ columns })).toThrow(
      "LineItems error handling cannot be disabled",
    );
  });

  it("rejects editors on the server identity property", () => {
    const columns: LineItemsColumn<{ id?: string | null }>[] = [
      { accessorKey: "id", edit: { editorType: "text" } },
    ];
    const store = createLineItemsDocumentStore({ columns });
    expect(() => createLineItemsEditing(store, columns)).toThrow(
      "Line IDs cannot have cell editors",
    );
  });
});
