import { createCellEditSession } from "@/components/internals/table-core/cell-session";
import type { createLineItemsDocumentStore } from "./document/store";
import type { LineItemsColumn } from "./types";

type Store<T extends Record<string, unknown>> = ReturnType<typeof createLineItemsDocumentStore<T>>;
type Session = ReturnType<typeof createCellEditSession<unknown>>;
type Cell = { property: string; session: Session };
const columnId = <T extends Record<string, unknown>>(column: LineItemsColumn<T>) =>
  (column.id ?? column.accessorKey)!;

/** Internal refusal translated by the cell owner before entering error presentation. */
export class LineItemsClearError extends Error {}

/** Binds logical cell drafts to a document, without owning another copy of its rows. @internal */
export function createLineItemsEditing<T extends Record<string, unknown>>(
  store: Store<T>,
  initialColumns: readonly LineItemsColumn<T>[],
) {
  let columns = initialColumns;
  let active = true;
  let phase: "idle" | "preparing" | "locked" = "idle";
  let saveRevision = 0;
  const listeners = new Set<() => void>();
  const cells = new Map<string, Map<string, Cell>>();
  function setPhase(next: typeof phase) {
    phase = next;
    for (const rowCells of cells.values())
      for (const cell of rowCells.values()) cell.session.setLocked(next !== "idle");
    // oxlint-disable-next-line unicorn/no-useless-spread -- Subscriptions can change during notification.
    for (const listener of [...listeners]) listener();
  }
  function assertCanMutate() {
    if (phase !== "idle") throw new Error("LineItems is locked for saving");
  }
  function retireCells() {
    const previous = [...cells.values()].flatMap((rowCells) => [...rowCells.values()]);
    cells.clear();
    for (const cell of previous) {
      cell.session.reset();
      cell.session.deactivate();
    }
  }
  const columnFor = (id: string) => columns.find((column) => columnId(column) === id);
  let indexedSnapshot: readonly T[] | undefined;
  let rowsByKey = new Map<string, T>();
  function getCurrentRow(key: string) {
    const snapshot = store.getSnapshot();
    if (snapshot !== indexedSnapshot) {
      rowsByKey = new Map(snapshot.map((row) => [store.getLineKey(row), row]));
      indexedSnapshot = snapshot;
    }
    return rowsByKey.get(key);
  }

  function cancelProperty(key: string, property: string, source?: Session) {
    for (const cell of cells.get(key)?.values() ?? [])
      if (cell.property === property && cell.session !== source) cell.session.reset();
  }
  function purgeRemoved() {
    for (const [key, rowCells] of cells) {
      if (getCurrentRow(key)) continue;
      for (const cell of rowCells.values()) cell.session.deactivate();
      cells.delete(key);
    }
  }
  function assertColumns(next: readonly LineItemsColumn<T>[]) {
    store.assertColumns(next);
    if (next.some((column) => column.edit && column.accessorKey === store.idKey))
      throw new Error("Line IDs cannot have cell editors");
  }
  assertColumns(initialColumns);

  return {
    /** Validates proposed columns without changing committed configuration or drafts. */
    assertColumns,
    assertCanMutate,
    isSaveLocked: () => phase !== "idle",
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async commitChanges() {
      if (!active) throw new Error("The LineItems document is no longer active");
      assertCanMutate();
      const candidate = ++saveRevision;
      const comparisonColumns = columns;
      const sessions = [...cells.values()].flatMap((rowCells) =>
        [...rowCells.values()].map((cell) => cell.session),
      );
      setPhase("preparing");
      try {
        // A normal commit supersedes sibling drafts; preparation must not choose one by column order.
        for (const rowCells of cells.values()) {
          const pendingProperties = new Set<string>();
          for (const cell of rowCells.values()) {
            if (cell.session.getState().status === "idle") continue;
            if (pendingProperties.has(cell.property))
              throw new Error("Confirm or discard duplicate-property drafts before saving");
            pendingProperties.add(cell.property);
          }
        }
        const results = await Promise.all(sessions.map((session) => session.confirmPending()));
        if (!active || candidate !== saveRevision) return null;
        if (results.some((success) => !success)) {
          setPhase("idle");
          return null;
        }
        const changes = store.getChanges(comparisonColumns);
        setPhase("locked");
        return changes;
      } catch (error) {
        if (active && candidate === saveRevision) setPhase("idle");
        throw error;
      }
    },
    finishSave() {
      if (phase === "preparing") throw new Error("Cannot finish a save during cell preparation");
      if (phase !== "idle") setPhase("idle");
    },
    replaceLines(confirmedLines: readonly T[]) {
      if (!active) throw new Error("The LineItems document is no longer active");
      if (phase === "preparing") throw new Error("Cannot replace lines during cell preparation");
      store.replaceLines(confirmedLines, retireCells);
    },
    getLineKey: store.getLineKey,
    /**
     * A cell deliberately reuses its session across rerenders and view remounts.
     * On-the-fly editor replacement (type or options) during an active draft is not
     * a targeted LineItems use case, so we do not compare editor contracts or migrate
     * drafts between editor-specific shapes. Keep that configuration stable mid-draft;
     * ordinary callback recreation and canEdit changes are supported independently.
     *
     * shortcut: Live editor replacement is unsupported, add session versioning if a concrete use case requires it.
     */
    getSession(row: T, column: LineItemsColumn<T>): Session {
      const key = store.getLineKey(row);
      let rowCells = cells.get(key);
      if (!rowCells) {
        rowCells = new Map();
        cells.set(key, rowCells);
      }
      let cell = rowCells.get(columnId(column));
      if (!cell) {
        const session = createCellEditSession<unknown>();
        session.setLocked(phase !== "idle");
        if (!active) session.deactivate();
        cell = { property: column.accessorKey!, session };
        rowCells.set(columnId(column), cell);
      }
      return cell.session;
    },
    /** Only a still-current successful cell check can write to the current row. */
    commitField(key: string, id: string, value: unknown) {
      const row = getCurrentRow(key);
      const column = columnFor(id);
      const source = cells.get(key)?.get(id)?.session;
      if (!active || !row || !column?.edit || column.accessorKey === undefined || !source)
        throw new Error("The edited cell no longer exists");
      if (phase === "locked") throw new Error("LineItems is locked for saving");
      if (!(column.edit.canEdit?.(row) ?? true)) throw new Error("The cell is not editable");
      const revision = source.getRevision();
      if (value === null) {
        if (column.edit.clearValue === false)
          throw new LineItemsClearError("The cell cannot be cleared");
        value = column.edit.clearValue ? column.edit.clearValue() : null;
        if (typeof (value as PromiseLike<unknown> | null | undefined)?.then === "function") {
          void Promise.resolve(value).catch(() => {});
          throw new Error("LineItems clearValue must return a synchronous value");
        }
        if (Object.is(value, row[column.accessorKey])) return;
      }
      // The correlated property contract is checked before this heterogeneous cell boundary.
      const check = column.edit.onValueCommitted as
        | ((row: Readonly<T>, value: unknown) => void | Promise<void>)
        | undefined;
      const adopt = () => {
        const current = getCurrentRow(key);
        const currentColumn = columnFor(id);
        if (
          !active ||
          !current ||
          source.getRevision() !== revision ||
          !currentColumn?.edit ||
          currentColumn.accessorKey !== column.accessorKey
        )
          return;
        if (phase === "locked") throw new Error("LineItems is locked for saving");
        if (!(currentColumn.edit.canEdit?.(current) ?? true))
          throw new Error("The cell is not editable");
        store.updateField(key, column.accessorKey!, value as T[keyof T & string]);
        cancelProperty(key, column.accessorKey!, source);
      };
      const result = check?.(row, value);
      if (result && typeof result.then === "function") return Promise.resolve(result).then(adopt);
      return adopt();
    },
    addLine(input: T) {
      assertCanMutate();
      return store.addLine(input);
    },
    updateField<K extends keyof T & string>(key: string, property: K, value: T[K]) {
      assertCanMutate();
      store.updateField(key, property, value);
      // Even a no-op direct write supersedes the editor's intent.
      cancelProperty(key, property);
    },
    removeLine(key: string) {
      assertCanMutate();
      store.removeLine(key);
      purgeRemoved();
    },
    revert() {
      assertCanMutate();
      store.revert();
      for (const rowCells of cells.values())
        for (const cell of rowCells.values()) cell.session.reset();
      purgeRemoved();
    },
    /** Adopts committed columns and retires removed cells or denied drafts. */
    reconcileColumns(next: readonly LineItemsColumn<T>[]) {
      assertColumns(next);
      columns = next;
      for (const [key, rowCells] of cells) {
        for (const [id, cell] of rowCells) {
          const after = columnFor(id);
          if (!after?.edit) {
            cell.session.reset();
            cell.session.deactivate();
            rowCells.delete(id);
            continue;
          }
          if (after.accessorKey !== cell.property) {
            cell.property = after.accessorKey!;
            cell.session.reset();
          }
          const row = getCurrentRow(key);
          if (row && !(after.edit.canEdit?.(row) ?? true)) cell.session.reset();
          if (active) cell.session.activate(true);
        }
        if (rowCells.size === 0) cells.delete(key);
      }
    },
    deactivate() {
      active = false;
      saveRevision++;
      for (const rowCells of cells.values())
        for (const cell of rowCells.values()) cell.session.deactivate();
      setPhase("idle");
    },
    activate() {
      active = true;
      for (const rowCells of cells.values())
        for (const cell of rowCells.values()) cell.session.activate(true);
    },
  };
}

export type LineItemsEditing<T extends Record<string, unknown>> = ReturnType<
  typeof createLineItemsEditing<T>
>;
/** Internal document handle; enumerable symbol properties survive shallow copies. */
export const LINE_ITEMS_EDITING = Symbol("LineItems.editing");

export function getLineItemsEditing<T extends Record<string, unknown>>(
  value: object,
): LineItemsEditing<T> {
  const editing = (value as { [LINE_ITEMS_EDITING]?: LineItemsEditing<T> })[LINE_ITEMS_EDITING];
  if (!editing) throw new Error("Editable LineItems requires the value returned by useLineItems");
  return editing;
}
