import { describe, expect, it, vi } from "vitest";
import { createLineItemsDocumentStore } from "./document/store";
import { createLineItemsEditing } from "./editing";
import type { LineItemsColumn } from "./types";

type Row = { id?: string; name: string | null; quantity: number | null };

function setup() {
  let allowed = true;
  let resolve!: () => void;
  const request = new Promise<void>((success) => {
    resolve = success;
  });
  const check = vi.fn(() => request);
  const columns: LineItemsColumn<Row>[] = [
    {
      accessorKey: "name",
      edit: { editorType: "text", canEdit: () => allowed, onValueCommitted: check },
    },
    { accessorKey: "quantity" },
  ];
  const store = createLineItemsDocumentStore<Row>({
    columns,
    lines: [{ id: "A", name: "Initial", quantity: 1 }],
  });
  const editing = createLineItemsEditing(store, columns);
  const session = editing.getSession(store.getSnapshot()[0], columns[0]);
  const listener = vi.fn();
  store.subscribe(listener);
  session.change("Candidate");
  session.confirm(() => editing.commitField("A", "name", "Candidate"));
  return {
    columns,
    store,
    editing,
    session,
    check,
    listener,
    deny: () => {
      allowed = false;
    },
    async complete() {
      resolve();
      await request;
      await Promise.resolve();
    },
  };
}

describe("permission checks at adoption", () => {
  it("fails a still-current confirmation when external permission changes without reconciliation", async () => {
    const editor = setup();
    const initial = editor.store.getSnapshot();
    expect(editor.session.getState().status).toBe("confirming");
    editor.deny();
    await editor.complete();

    expect(editor.session.getState()).toMatchObject({
      status: "failed",
      source: "commit",
      draft: "Candidate",
      error: new Error("The cell is not editable"),
    });
    expect(editor.store.getSnapshot()).toBe(initial);
    expect(editor.store.isDirty()).toBe(false);
    expect(editor.listener).not.toHaveBeenCalled();
    expect(editor.check).toHaveBeenCalledTimes(1);
  });

  it.each(["write", "revert", "remove", "dispose", "reconciled-permission"] as const)(
    "does not turn a late result into an error after %s cancels the edit",
    async (action) => {
      const editor = setup();
      editor.deny();
      if (action === "write") editor.editing.updateField("A", "name", "Command");
      if (action === "revert") editor.editing.revert();
      if (action === "remove") editor.editing.removeLine("A");
      if (action === "dispose") editor.editing.deactivate();
      if (action === "reconciled-permission") editor.editing.reconcileColumns(editor.columns);
      const snapshot = editor.store.getSnapshot();
      const notifications = editor.listener.mock.calls.length;
      await editor.complete();

      expect(editor.store.getSnapshot()).toBe(snapshot);
      expect(editor.listener).toHaveBeenCalledTimes(notifications);
      expect(editor.session.getFailure()).toBeUndefined();
      if (action !== "dispose" && action !== "remove")
        expect(editor.session.getState()).toEqual({ status: "idle" });
      expect(editor.store.getSnapshot().map((row) => row.name)).toEqual(
        action === "remove" ? [] : [action === "write" ? "Command" : "Initial"],
      );
    },
  );

  it("adopts an allowed confirmation into the current row", async () => {
    const editor = setup();
    editor.editing.updateField("A", "quantity", 2);
    await editor.complete();

    expect(editor.session.getState()).toEqual({ status: "idle" });
    expect(editor.store.getSnapshot()[0]).toMatchObject({ name: "Candidate", quantity: 2 });
    expect(editor.check).toHaveBeenCalledTimes(1);
    expect(editor.listener).toHaveBeenCalledTimes(2);
  });
});
