import { createCellEditSession } from "@/components/internals/table-core/cell-session";
import type { createLineItemsDocumentStore } from "./document/store";
import type { LineItemsColumn } from "./types";

type Store<T extends Record<string, unknown>> = ReturnType<typeof createLineItemsDocumentStore<T>>;
type Session = ReturnType<typeof createCellEditSession<unknown>>;
type Cell = { property: string; session: Session };
const columnId = <T extends Record<string, unknown>>(column: LineItemsColumn<T>) =>
  (column.id ?? column.accessorKey)!;

function sameEditor<T extends Record<string, unknown>>(
  before: LineItemsColumn<T> | undefined,
  after: LineItemsColumn<T> | undefined,
) {
  const left = before?.edit;
  const right = after?.edit;
  return (
    !!left &&
    !!right &&
    before?.accessorKey === after?.accessorKey &&
    left.editorType === right.editorType &&
    left.onValueCommitted === right.onValueCommitted &&
    left.canEdit === right.canEdit &&
    left.error === right.error &&
    !(
      left.editorType === "date" &&
      right.editorType === "date" &&
      left.withTime !== right.withTime
    ) &&
    !(
      left.editorType === "combobox" &&
      right.editorType === "combobox" &&
      JSON.stringify(left.options) !== JSON.stringify(right.options)
    )
  );
}

/** Binds logical cell drafts to a document, without owning another copy of its rows. @internal */
export function createLineItemsEditing<T extends Record<string, unknown>>(
  store: Store<T>,
  initialColumns: readonly LineItemsColumn<T>[],
) {
  let columns = initialColumns;
  let active = true;
  const cells = new Map<string, Map<string, Cell>>();
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
      if (cell.property === property && cell.session !== source) cell.session.cancel();
  }
  function purgeRemoved() {
    for (const [key, rowCells] of cells) {
      if (getCurrentRow(key)) continue;
      for (const cell of rowCells.values()) cell.session.deactivate();
      cells.delete(key);
    }
  }
  function assertColumns(next: readonly LineItemsColumn<T>[]) {
    if (next.some((column) => column.edit && column.accessorKey === store.idKey))
      throw new Error("Line IDs cannot have cell editors");
  }
  assertColumns(initialColumns);

  return {
    assertColumns,
    getLineKey: store.getLineKey,
    isCurrentEditor(column: LineItemsColumn<T>) {
      return sameEditor(columnFor(columnId(column)), column);
    },
    getSession(row: T, column: LineItemsColumn<T>): Session {
      const key = store.getLineKey(row);
      let rowCells = cells.get(key);
      if (!rowCells) {
        rowCells = new Map();
        cells.set(key, rowCells);
      }
      let cell = rowCells.get(columnId(column));
      if (!cell) {
        const session = createCellEditSession<unknown>(column.edit?.error !== false);
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
      if (!(column.edit.canEdit?.(row) ?? true)) throw new Error("The cell is not editable");
      const revision = source.getRevision();
      // The correlated property contract is checked before this heterogeneous cell boundary.
      const check = column.edit.onValueCommitted as
        | ((row: Readonly<T>, value: unknown) => void | Promise<void>)
        | undefined;
      const adopt = () => {
        const current = getCurrentRow(key);
        if (
          !active ||
          !current ||
          source.getRevision() !== revision ||
          !sameEditor(column, columnFor(id)) ||
          !(columnFor(id)?.edit?.canEdit?.(current) ?? true)
        )
          return;
        store.updateField(key, column.accessorKey!, value as T[keyof T & string]);
        cancelProperty(key, column.accessorKey!, source);
      };
      if (column.edit.error === false) {
        adopt();
        return check?.(row, value);
      }
      const result = check?.(row, value);
      if (result && typeof result.then === "function") return Promise.resolve(result).then(adopt);
      adopt();
    },
    updateField<K extends keyof T & string>(key: string, property: K, value: T[K]) {
      store.updateField(key, property, value);
      // Even a no-op direct write supersedes the editor's intent.
      cancelProperty(key, property);
    },
    removeLine(key: string) {
      store.removeLine(key);
      purgeRemoved();
    },
    revert() {
      store.revert();
      for (const rowCells of cells.values())
        for (const cell of rowCells.values()) cell.session.cancel();
      purgeRemoved();
    },
    /** Only committed editor policies may retire drafts; presentation changes preserve them. */
    setColumns(next: readonly LineItemsColumn<T>[]) {
      assertColumns(next);
      const previous = columns;
      columns = next;
      for (const [key, rowCells] of cells) {
        for (const [id, cell] of rowCells) {
          const before = previous.find((column) => columnId(column) === id);
          const after = columnFor(id);
          if (!after?.edit || after.accessorKey !== cell.property) {
            cell.session.cancel();
            cell.session.deactivate();
            rowCells.delete(id);
            continue;
          }
          const row = getCurrentRow(key);
          if (!sameEditor(before, after) || (row && !(after.edit.canEdit?.(row) ?? true)))
            cell.session.cancel();
          if (active) cell.session.activate(after.edit.error !== false);
        }
        if (rowCells.size === 0) cells.delete(key);
      }
    },
    deactivate() {
      active = false;
      for (const rowCells of cells.values())
        for (const cell of rowCells.values()) cell.session.deactivate();
    },
    activate() {
      active = true;
      for (const rowCells of cells.values())
        for (const [id, cell] of rowCells)
          cell.session.activate(columnFor(id)?.edit?.error !== false);
    },
  };
}

export type LineItemsEditing<T extends Record<string, unknown>> = ReturnType<
  typeof createLineItemsEditing<T>
>;
const owners = new WeakMap<object, unknown>();

/** Keeps the private editing owner off the hook's headless command surface. */
export function bindLineItemsEditing<T extends Record<string, unknown>>(
  value: object,
  editing: LineItemsEditing<T>,
) {
  owners.set(value, editing);
}
export function getLineItemsEditing<T extends Record<string, unknown>>(
  value: object,
): LineItemsEditing<T> {
  const editing = owners.get(value);
  if (!editing) throw new Error("Editable LineItems requires the value returned by useLineItems");
  return editing as LineItemsEditing<T>;
}
