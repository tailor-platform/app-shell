import { Suspense } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, renderHook } from "@testing-library/react";
import { useLineItems } from "./use-line-items";
import { createLineItemsDocumentStore } from "./document/store";
import { createLineItemsEditing } from "./editing";
import type { LineItemsColumn, UseLineItemsReturn } from "./types";

afterEach(cleanup);
type Row = { id?: string; name: string | null; quantity: number };
const empty = { added: [], updated: [], removed: [], order: null };
const exact: LineItemsColumn<Row>[] = [{ accessorKey: "quantity" }];
const equivalent: LineItemsColumn<Row>[] = [
  { accessorKey: "quantity", equals: (baseline, current) => Math.abs(baseline - current) < 0.01 },
];
const rows: Row[] = [{ id: "A", name: "First", quantity: 10 }];

describe("useLineItems changeset inspection", () => {
  it("uses render-local equality configuration while retained getters read current committed rows", () => {
    const { result, rerender } = renderHook(
      (columns: LineItemsColumn<Row>[]) => useLineItems({ columns, defaultLines: rows }),
      { initialProps: exact },
    );
    const getExactChanges = result.current.getChanges;
    act(() => result.current.updateField("A", "quantity", 10.001));
    const changed = { ...empty, updated: [{ lineKey: "A", changes: { quantity: 10.001 } }] };
    expect(getExactChanges()).toEqual(changed);
    expect(result.current.isDirty).toBe(true);
    const snapshot = result.current.lines;

    rerender(equivalent);
    expect(result.current.lines).toBe(snapshot);
    expect(result.current.getChanges()).toEqual(empty);
    expect(result.current.isDirty).toBe(false);
    expect(getExactChanges()).toEqual(changed);

    act(() => result.current.updateField("A", "quantity", 11));
    expect(result.current.getChanges().updated).toEqual([
      { lineKey: "A", changes: { quantity: 11 } },
    ]);
    expect(getExactChanges().updated).toEqual([{ lineKey: "A", changes: { quantity: 11 } }]);
    expect(result.current.isDirty).toBe(true);
  });

  it("does not leak equality configuration from a suspended render into a committed getter", () => {
    const pending = new Promise<never>(() => {});
    let value!: UseLineItemsReturn<Row>;
    function Owner({ columns, suspend }: { columns: LineItemsColumn<Row>[]; suspend: boolean }) {
      value = useLineItems({ columns, defaultLines: rows });
      if (suspend) throw pending;
      return null;
    }
    const { rerender } = render(
      <Suspense fallback={null}>
        <Owner columns={exact} suspend={false} />
      </Suspense>,
    );
    act(() => value.updateField("A", "quantity", 10.001));
    const getCommittedChanges = value.getChanges;
    const changes = getCommittedChanges();
    rerender(
      <Suspense fallback={null}>
        <Owner columns={equivalent} suspend={true} />
      </Suspense>,
    );
    expect(getCommittedChanges()).toEqual(changes);
    expect(getCommittedChanges().updated).toEqual([
      { lineKey: "A", changes: { quantity: 10.001 } },
    ]);
    rerender(
      <Suspense fallback={null}>
        <Owner columns={equivalent} suspend={false} />
      </Suspense>,
    );
    expect(value.isDirty).toBe(false);
    expect(value.getChanges()).toEqual(empty);
  });

  it("keeps committed changes inspectable without confirming, validating, or discarding pending/rejected drafts", async () => {
    let reject!: (reason: unknown) => void;
    const request = new Promise<void>((_resolve, failure) => {
      reject = failure;
    });
    const check = vi.fn(() => request);
    const canEdit = vi.fn(() => true);
    const columns: LineItemsColumn<Row>[] = [
      { accessorKey: "name", edit: { editorType: "text", onValueCommitted: check, canEdit } },
      { accessorKey: "quantity" },
    ];
    const store = createLineItemsDocumentStore({ columns, lines: rows });
    const editing = createLineItemsEditing(store, columns);
    const session = editing.getSession(store.getSnapshot()[0], columns[0]);
    session.begin("First");
    expect(store.getChanges()).toEqual(empty);
    expect(store.isDirty()).toBe(false);
    session.change("Unconfirmed");
    const draft = session.getState();
    editing.updateField("A", "quantity", 11);
    const committed = { ...empty, updated: [{ lineKey: "A", changes: { quantity: 11 } }] };
    expect(store.getChanges()).toEqual(committed);
    expect(session.getState()).toBe(draft);
    expect(check).not.toHaveBeenCalled();
    expect(canEdit).not.toHaveBeenCalled();

    session.confirm(() => editing.commitField("A", "name", "Unconfirmed"));
    const confirming = session.getState();
    const permissionChecks = canEdit.mock.calls.length;
    const snapshot = store.getSnapshot();
    const listener = vi.fn();
    store.subscribe(listener);
    expect(store.getChanges()).toEqual(committed);
    expect(store.isDirty()).toBe(true);
    expect(session.getState()).toBe(confirming);
    expect(check).toHaveBeenCalledTimes(1);
    expect(canEdit).toHaveBeenCalledTimes(permissionChecks);

    const error = new Error("Document rule rejected the value");
    reject(error);
    await request.catch(() => {});
    await Promise.resolve();
    const failed = session.getState();
    expect(session.getFailure()).toMatchObject({ error, draft: "Unconfirmed" });
    expect(store.getChanges()).toEqual(committed);
    expect(store.getSnapshot()).toBe(snapshot);
    expect(session.getState()).toBe(failed);
    expect(listener).not.toHaveBeenCalled();
    expect(check).toHaveBeenCalledTimes(1);

    editing.updateField("A", "quantity", 10);
    expect(store.getChanges()).toEqual(empty);
    expect(store.isDirty()).toBe(false);
    expect(session.getState()).toBe(failed);
  });
});
