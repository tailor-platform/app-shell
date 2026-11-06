import { createCellEditSession } from "@/components/internals/table-core/cell-session";
import type { createLineItemsDocumentStore } from "./document-store";
import {
  sameEditorContract,
  type LineItemsEditorAdapter,
  type LineItemsParseResult,
} from "./editor-adapter";
import { resolveLineItemsEditor } from "./editors";
import type { useLineItemsT } from "./i18n";
import type { LineItemsColumn } from "./types";

type Store<T extends Record<string, unknown>> = ReturnType<typeof createLineItemsDocumentStore<T>>;
type Session = ReturnType<typeof createCellEditSession<unknown>>;
type Cell = {
  lineKey: string;
  columnId: string;
  property: string;
  session: Session;
  changed: boolean;
};

function sameEditor<T extends Record<string, unknown>>(
  before: LineItemsColumn<T> | undefined,
  after: LineItemsColumn<T> | undefined,
  leftAdapter: LineItemsEditorAdapter | undefined,
  rightAdapter: LineItemsEditorAdapter | undefined,
) {
  const left = before?.edit;
  const right = after?.edit;
  return (
    !!left &&
    !!right &&
    !!leftAdapter &&
    !!rightAdapter &&
    before?.accessorKey === after?.accessorKey &&
    sameEditorContract(leftAdapter, rightAdapter) &&
    left.onValueCommitted === right.onValueCommitted &&
    left.canEdit === right.canEdit &&
    left.error === right.error
  );
}

/**
 * Binds cell sessions to one observable document. Sessions outlive their rendered controls,
 * but never own adopted rows or baseline state. Programmatic writes discard conflicting
 * drafts; removal, revert, configuration changes, and disposal invalidate pending adoption.
 * Only committed column configuration is used to check callbacks and permissions.
 * @internal
 */
export function createLineItemsEditing<T extends Record<string, unknown>>(
  store: Store<T>,
  initialColumns: readonly LineItemsColumn<T>[],
) {
  let columns = initialColumns;
  let active = true;
  const cells = new Map<string, Map<string, Cell>>();
  const records = () => [...cells.values()].flatMap((row) => [...row.values()]);
  const columnFor = (id: string) =>
    columns.find((column) => (column.id ?? column.accessorKey) === id);
  const getCurrentRow = (lineKey: string) =>
    store.getSnapshot().find((row) => store.getLineKey(row) === lineKey);

  function cancelProperty(lineKey: string, property: string, source?: Session) {
    for (const cell of cells.get(lineKey)?.values() ?? []) {
      if (cell.property === property && cell.session !== source) cell.session.cancel();
    }
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
    const resolved = new Map<string, LineItemsEditorAdapter>();
    for (const column of next) {
      if (column.edit)
        resolved.set(
          (column.id ?? column.accessorKey)!,
          resolveLineItemsEditor(column.edit.editor),
        );
    }
    return resolved;
  }
  let adapters = assertColumns(initialColumns);

  function isCurrentEditor(column: LineItemsColumn<T>, adapter?: LineItemsEditorAdapter) {
    const id = (column.id ?? column.accessorKey)!;
    return sameEditor(
      columnFor(id),
      column,
      adapters.get(id),
      adapter ?? (column.edit && resolveLineItemsEditor(column.edit.editor)),
    );
  }
  function getCell(row: T, column: LineItemsColumn<T>): Cell {
    const lineKey = store.getLineKey(row);
    const columnId = (column.id ?? column.accessorKey)!;
    let rowCells = cells.get(lineKey);
    if (!rowCells) {
      rowCells = new Map();
      cells.set(lineKey, rowCells);
    }
    let cell = rowCells.get(columnId);
    if (!cell) {
      const session = createCellEditSession<unknown>(column.edit?.error !== false);
      if (!active) session.deactivate();
      cell = { lineKey, columnId, property: column.accessorKey!, session, changed: false };
      const created = cell;
      session.subscribe(() => {
        if (session.getState().status === "idle") created.changed = false;
      });
      rowCells.set(columnId, cell);
    }
    return cell;
  }
  function begin(row: T, column: LineItemsColumn<T>, adapter: LineItemsEditorAdapter) {
    const current = getCurrentRow(store.getLineKey(row));
    if (
      !active ||
      !current ||
      !isCurrentEditor(column, adapter) ||
      !(column.edit?.canEdit?.(current) ?? true)
    )
      return;
    const cell = getCell(row, column);
    if (cell.session.getState().status !== "idle") return;
    cell.changed = false;
    cell.session.begin(adapter.toDraft(current[cell.property]));
  }

  const editing = {
    assertColumns,
    getLineKey: store.getLineKey,
    getCurrentRow,
    isCurrentEditor,
    /** Creating/reading a session does not adopt rows; views subscribe directly to its state. */
    getSession: (row: T, column: LineItemsColumn<T>): Session => getCell(row, column).session,
    begin,
    change(row: T, column: LineItemsColumn<T>, adapter: LineItemsEditorAdapter, draft: unknown) {
      const current = getCurrentRow(store.getLineKey(row));
      if (
        !active ||
        !current ||
        !isCurrentEditor(column, adapter) ||
        !(column.edit?.canEdit?.(current) ?? true)
      )
        return;
      begin(row, column, adapter);
      const cell = getCell(row, column);
      cell.changed = true;
      cell.session.change(draft);
    },
    commit(
      row: T,
      column: LineItemsColumn<T>,
      adapter: LineItemsEditorAdapter,
      t: ReturnType<typeof useLineItemsT>,
    ): Promise<boolean> {
      if (!active || !getCurrentRow(store.getLineKey(row)) || !isCurrentEditor(column, adapter))
        return Promise.resolve(false);
      const cell = getCell(row, column);
      const current = cell.session.getState();
      if (current.status === "idle") return Promise.resolve(true);
      if (current.status === "confirming" || !cell.changed)
        return cell.session.confirm(() => undefined);
      let parsed: LineItemsParseResult<unknown>;
      try {
        parsed = adapter.parse(current.draft, t);
        if (
          !parsed ||
          typeof parsed !== "object" ||
          (parsed.ok !== true && parsed.ok !== false) ||
          (parsed.ok === true && !("value" in parsed)) ||
          (parsed.ok === false && typeof parsed.message !== "string")
        )
          throw new Error("Invalid editor parse result");
      } catch (error) {
        cell.session.fail(new Error("Editor parsing failed", { cause: error }), "parse");
        return Promise.resolve(false);
      }
      if (!parsed.ok) {
        cell.session.fail(parsed.message, "parse");
        return Promise.resolve(false);
      }
      return cell.session.confirm(() => {
        if (!Object.is(parsed.value, getCurrentRow(cell.lineKey)?.[cell.property]))
          return editing.commitField(cell.lineKey, cell.columnId, parsed.value);
      });
    },
    /** The session confirms first; only its still-current successful check may adopt a value. */
    commitField(lineKey: string, columnId: string, value: unknown) {
      const row = getCurrentRow(lineKey);
      const column = columnFor(columnId);
      const source = cells.get(lineKey)?.get(columnId)?.session;
      if (!active || !row || !column?.edit || column.accessorKey === undefined || !source)
        throw new Error("The edited cell no longer exists");
      if (!(column.edit.canEdit?.(row) ?? true)) throw new Error("The cell is not editable");
      const revision = source.getRevision();
      const check = column.edit.onValueCommitted as
        | ((row: Readonly<T>, value: unknown) => void | Promise<void>)
        | undefined;
      const adopt = () => {
        const current = getCurrentRow(lineKey);
        const currentColumn = columnFor(columnId);
        if (
          !active ||
          !current ||
          source.getRevision() !== revision ||
          currentColumn?.edit?.onValueCommitted !== check ||
          !(currentColumn?.edit?.canEdit?.(current) ?? true)
        )
          return;
        store.updateField(lineKey, column.accessorKey!, value as T[keyof T & string]);
        cancelProperty(lineKey, column.accessorKey!, source);
      };
      if (column.edit.error === false) {
        // DataTable-compatible opt-out: adoption is eager and callback errors remain caller-owned.
        adopt();
        return check?.(row, value);
      }
      const result = check?.(row, value);
      if (result && typeof result.then === "function") return Promise.resolve(result).then(adopt);
      adopt();
    },
    updateField<K extends keyof T & string>(lineKey: string, property: K, value: T[K]) {
      store.updateField(lineKey, property, value);
      cancelProperty(lineKey, property);
    },
    removeLine(lineKey: string) {
      store.removeLine(lineKey);
      purgeRemoved();
    },
    revert() {
      store.revert();
      for (const cell of records()) cell.session.cancel();
      purgeRemoved();
    },
    /** Called only after React commits; display-only changes do not discard a draft. */
    setColumns(next: readonly LineItemsColumn<T>[]) {
      const nextAdapters = assertColumns(next);
      const previous = columns;
      const previousAdapters = adapters;
      columns = next;
      adapters = nextAdapters;
      for (const [key, rowCells] of cells) {
        for (const [id, cell] of rowCells) {
          const before = previous.find((column) => (column.id ?? column.accessorKey) === id);
          const after = columnFor(id);
          const right = after?.edit;
          if (!right || after?.accessorKey !== cell.property) {
            rowCells.delete(id);
            cell.session.cancel();
            cell.session.deactivate();
            continue;
          }
          if (!sameEditor(before, after, previousAdapters.get(id), adapters.get(id)))
            cell.session.cancel();
          const row = getCurrentRow(key);
          if (row && !(right.canEdit?.(row) ?? true)) cell.session.cancel();
          if (active) cell.session.activate(right.error !== false);
        }
        if (rowCells.size === 0) cells.delete(key);
      }
    },
    /** React owner cleanup, not view detachment, ends pending cell work. */
    deactivate() {
      active = false;
      for (const cell of records()) cell.session.deactivate();
    },
    activate() {
      active = true;
      for (const cell of records())
        cell.session.activate(columnFor(cell.columnId)?.edit?.error !== false);
    },
  };
  return editing;
}

export type LineItemsEditing<T extends Record<string, unknown>> = ReturnType<
  typeof createLineItemsEditing<T>
>;
const owners = new WeakMap<object, unknown>();

/** Bind the exact hook record without adding an internal controller to its headless API. */
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
