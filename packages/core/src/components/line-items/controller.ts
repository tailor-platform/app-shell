import {
  createCellEditSession,
  type CellEditSession,
} from "@/components/internals/table-core/cell-session";
import { createLineItemsDocument } from "./document";
import type {
  LineItemsChangeSet,
  LineItemsColumn,
  LineItemsResetInput,
  LineItemsResetOptions,
  LineItemsValidationIssue,
  UseLineItemsOptions,
  UseLineItemsReturn,
} from "./types";

type Editor = {
  /** Reads the logical session and live row, not a mounted DOM input. */
  commit: () => Promise<boolean>;
  isChanged: () => boolean;
  editorType?: string;
};
type Cell = {
  clientKey: string;
  columnId: string;
  session: CellEditSession<unknown>;
  editor?: Editor;
  detach: () => void;
};
type Preparation<T extends Record<string, unknown>> = {
  promise: Promise<LineItemsChangeSet<T> | null>;
  version: number;
  sessions: Map<Cell, number>;
  resolve: (value: LineItemsChangeSet<T> | null) => void;
};

const controllers = new WeakMap<object, unknown>();

function assertSupported<T extends Record<string, unknown>>(options: UseLineItemsOptions<T>) {
  if ("lines" in options || "onLinesChange" in options)
    throw new Error("This LineItems API owns its rows; use defaultLines, not controlled lines");
  if (options.columns.some((column) => column.commit === "metadata"))
    throw new Error("Independent metadata persistence is not supported by useLineItems yet");
}

function ruleBindings<T extends Record<string, unknown>>(columns: readonly LineItemsColumn<T>[]) {
  return columns.map((column) => [
    column.id ?? column.accessorKey,
    column.accessorKey,
    column.normalize,
    column.edit?.onValueCommitted,
    column.edit?.canEdit,
    column.equals,
    column.commit,
    column.edit?.editorType === "date" ? column.edit.min : undefined,
    column.edit?.editorType === "date" ? column.edit.max : undefined,
  ]);
}
function sameBindings(left: unknown[][], right: unknown[][]) {
  return (
    left.length === right.length &&
    left.every((row, index) => row.every((value, field) => Object.is(value, right[index]?.[field])))
  );
}

/** Internal bridge between the public headless record and document-owned cell sessions. */
export function createLineItemsController<T extends Record<string, unknown>>(
  initial: UseLineItemsOptions<T>,
) {
  assertSupported(initial);
  let options = initial;
  let bindings = ruleBindings(initial.columns);
  const idKey = initial.idKey ?? "id";
  const document = createLineItemsDocument<T>({
    columns: initial.columns,
    lines: initial.defaultLines,
    idKey: idKey as keyof T & string,
  });
  const cells = new Map<string, Map<string, Cell>>();
  const listeners = new Set<() => void>();
  let snapshot = 0;
  let version = 0;
  let active = true;
  let preparing: Preparation<T> | null = null;
  let lastUnsaved = document.isDirty();
  let errors: readonly LineItemsValidationIssue[] = [];
  let selectedIds = new Set<string>();
  let sortState: { columnId: string; direction: "Asc" | "Desc" } | undefined;
  let sortedCache:
    | {
        rows: readonly T[];
        comparator: (left: T, right: T) => number;
        state: typeof sortState;
        result: readonly T[];
      }
    | undefined;

  function getRows(): readonly T[] {
    const rows = document.getRows();
    const comparator = sortState && columnFor(sortState.columnId)?.sort?.comparator;
    if (!sortState || !comparator) return rows;
    if (
      sortedCache?.rows === rows &&
      sortedCache.comparator === comparator &&
      sortedCache.state === sortState
    )
      return sortedCache.result;
    const direction = sortState.direction === "Asc" ? 1 : -1;
    const result = Object.freeze(rows.toSorted((a, b) => direction * comparator(a, b)));
    sortedCache = { rows, comparator, state: sortState, result };
    return result;
  }

  function invalidatePreparation() {
    const previous = preparing;
    preparing = null;
    previous?.resolve(null);
  }

  function getCurrentRow(clientKey: string): T | undefined {
    return document.getRows().find((row) => document.getClientKey(row) === clientKey);
  }
  function records(): Cell[] {
    return [...cells.values()].flatMap((row) => [...row.values()]);
  }
  function hasUnsavedChanges(): boolean {
    return (
      document.isDirty() ||
      records().some((cell) => !!cell.session.getFailure() || !!cell.editor?.isChanged())
    );
  }
  function emit() {
    lastUnsaved = hasUnsavedChanges();
    snapshot++;
    // oxlint-disable-next-line unicorn/no-useless-spread -- Notification may change subscriptions.
    for (const listener of [...listeners]) listener();
  }
  function sessionChanged(cell: Cell) {
    const expected = preparing?.sessions.get(cell);
    if (
      preparing &&
      expected !== undefined &&
      cell.session.getState().status === "idle" &&
      columnFor(cell.columnId)?.edit?.error === false
    ) {
      // Eager confirmation discards its draft before adopting the value.
      preparing.sessions.set(cell, cell.session.getRevision());
    } else if (
      preparing &&
      ((expected !== undefined && expected !== cell.session.getRevision()) ||
        (expected === undefined && cell.editor?.isChanged()))
    )
      invalidatePreparation();
    if (hasUnsavedChanges() !== lastUnsaved) emit();
  }
  function getCell(row: T, columnId: string): Cell {
    const clientKey = document.getClientKey(row);
    let rowCells = cells.get(clientKey);
    if (!rowCells) {
      rowCells = new Map();
      cells.set(clientKey, rowCells);
    }
    let cell = rowCells.get(columnId);
    if (!cell) {
      cell = {
        clientKey,
        columnId,
        session: createCellEditSession<unknown>(columnFor(columnId)?.edit?.error !== false),
        detach: () => {},
      };
      const record = cell;
      cell.detach = cell.session.subscribe(() => sessionChanged(record));
      if (!active) cell.session.deactivate();
      rowCells.set(columnId, cell);
    }
    return cell;
  }
  function cancelCells(predicate: (cell: Cell) => boolean) {
    for (const cell of records()) {
      if (predicate(cell)) cell.session.cancel();
    }
  }
  function purgeRemoved() {
    for (const [key, rowCells] of cells) {
      if (getCurrentRow(key)) continue;
      for (const cell of rowCells.values()) {
        cell.detach();
        cell.session.deactivate();
      }
      cells.delete(key);
    }
  }
  function changed() {
    version++;
    errors = [];
    invalidatePreparation();
    purgeRemoved();
    emit();
  }
  function columnFor(columnId: string) {
    return options.columns.find((column) => (column.id ?? column.accessorKey) === columnId);
  }
  function invalidateWrites(
    before: readonly T[],
    targets: Map<string, Set<string>>,
    source?: Cell,
  ) {
    const previous = new Map(before.map((row) => [document.getClientKey(row), row]));
    cancelCells((cell) => {
      if (cell === source) return false;
      const column = columnFor(cell.columnId);
      const property = column?.accessorKey;
      if (property === undefined) return false;
      const current = getCurrentRow(cell.clientKey);
      const old = previous.get(cell.clientKey);
      return (
        !!targets.get(cell.clientKey)?.has(property) ||
        (!!current && !!old && !Object.is(current[property], old[property]))
      );
    });
  }
  function updateLines(patches: readonly { lineKey: string; patch: Partial<T> }[]) {
    const before = document.getRows();
    const targets = new Map<string, Set<string>>();
    for (const { lineKey, patch } of patches) {
      const row = before.find((candidate) => document.getLineKey(candidate) === lineKey);
      if (row) {
        const key = document.getClientKey(row);
        targets.set(key, new Set([...(targets.get(key) ?? []), ...Object.keys(patch)]));
      }
    }
    document.updateLines(patches);
    if (document.getRows() === before) return;
    invalidateWrites(before, targets);
    changed();
  }
  function commitField(clientKey: string, columnId: string, value: unknown) {
    const row = getCurrentRow(clientKey);
    const column = columnFor(columnId);
    if (!row || column?.accessorKey === undefined)
      throw new Error("The edited cell no longer exists");
    const source = cells.get(clientKey)?.get(columnId);
    const revision = source?.session.getRevision();
    const check = column.edit?.onValueCommitted as
      | ((row: Readonly<T>, value: unknown) => void | Promise<void>)
      | undefined;
    const adopt = () => {
      if (
        !active ||
        source?.session.getRevision() !== revision ||
        columnFor(columnId)?.edit?.onValueCommitted !== check
      )
        return;
      const current = getCurrentRow(clientKey);
      if (!current) return;
      const ownPreparation = source !== undefined && preparing?.sessions.get(source) === revision;
      const before = document.getRows();
      document.updateLines([
        {
          lineKey: document.getLineKey(current),
          patch: { [column.accessorKey!]: value } as Partial<T>,
        },
      ]);
      invalidateWrites(before, new Map(), source);
      errors = [];
      if (!ownPreparation) {
        version++;
        invalidatePreparation();
      }
      emit();
    };
    if (column.edit?.error === false) {
      // Match DataTable's eager opt-out: adoption does not wait for or intercept the callback.
      adopt();
      return check?.(row, value);
    }
    const result = check?.(row, value);
    if (result && typeof result.then === "function") return Promise.resolve(result).then(adopt);
    adopt();
  }
  function commitEdits(): Promise<LineItemsChangeSet<T> | null> {
    if (!active) return Promise.resolve(null);
    if (preparing) return preparing.promise;
    const candidates = records().filter((cell) => cell.session.getState().status !== "idle");
    let resolve!: (value: LineItemsChangeSet<T> | null) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<LineItemsChangeSet<T> | null>((success, failure) => {
      resolve = success;
      reject = failure;
    });
    const attempt: Preparation<T> = {
      promise,
      version,
      sessions: new Map(records().map((cell) => [cell, cell.session.getRevision()])),
      resolve,
    };
    preparing = attempt;
    async function prepare() {
      const results = await Promise.all(
        candidates.map((cell) => {
          // Preparation is not an implicit retry of a prior failed confirmation.
          if (cell.session.getFailure() || !cell.editor) return false;
          return cell.editor.commit();
        }),
      );
      const isCurrent = () =>
        active &&
        preparing === attempt &&
        attempt.version === version &&
        records().every((cell) => {
          const state = cell.session.getState();
          return (
            state.status !== "failed" && state.status !== "confirming" && !cell.editor?.isChanged()
          );
        });
      if (!isCurrent() || results.some((ok) => !ok)) return null;
      const lines = document.getRows();
      const keys = new Map(lines.map((line) => [line, document.getLineKey(line)]));
      const intrinsic: LineItemsValidationIssue[] = document.getErrors().map((issue) => ({
        scope: "cell",
        ...issue,
      }));
      const issues =
        intrinsic.length > 0
          ? intrinsic
          : ((await options.validate?.(lines, {
              getLineKey(line) {
                const key = keys.get(line as T);
                if (key === undefined)
                  throw new Error("Validation line does not belong to this snapshot");
                return key;
              },
            })) ?? []);
      if (!isCurrent()) return null;
      errors = Object.freeze(issues.map((issue) => Object.freeze({ ...issue })));
      emit();
      if (!isCurrent() || errors.length > 0) return null;
      return document.getChangeSet();
    }
    void prepare().then(
      (result) => {
        if (preparing === attempt) preparing = null;
        resolve(result);
      },
      (error: unknown) => {
        if (preparing !== attempt) {
          resolve(null);
          return;
        }
        preparing = null;
        reject(error);
      },
    );
    return promise;
  }

  return {
    document,
    getClientKey: document.getClientKey,
    getCurrentRow,
    // A column's adapter owns its draft contract; the registry only coordinates lifecycle.
    getSession: <TDraft = string>(row: T, columnId: string) =>
      getCell(row, columnId).session as CellEditSession<TDraft>,
    registerEditor(row: T, columnId: string, editor: Editor) {
      const cell = getCell(row, columnId);
      // Keep the draft's parser until configure validates any editor transition.
      if (
        cell.session.getState().status !== "idle" &&
        cell.editor &&
        cell.editor.editorType !== editor.editorType
      )
        return () => {};
      cell.editor = editor;
      if (hasUnsavedChanges() !== lastUnsaved) emit();
      // The logical callback remains usable after the view detaches/virtualizes.
      return () => {};
    },
    commitField,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    getErrors: () => errors,
    getRows,
    getSortState: () => sortState,
    setSort(columnId: string, direction: "Asc" | "Desc" | undefined) {
      if (direction && !columnFor(columnId)?.sort)
        throw new Error(`Column "${columnId}" does not support sorting`);
      if (sortState?.columnId === columnId && sortState.direction === direction) return;
      const previous = sortState;
      sortState = direction ? { columnId, direction } : undefined;
      try {
        getRows();
      } catch (error) {
        sortState = previous;
        throw error;
      }
      emit();
    },
    configure(next: UseLineItemsOptions<T>, selectedKeys: readonly string[] = []) {
      assertSupported(next);
      if ((next.idKey ?? "id") !== idKey) throw new Error("Remount LineItems to change idKey");
      const previousComparator = sortState && columnFor(sortState.columnId)?.sort?.comparator;
      const nextSelected = new Set(selectedKeys);
      const permissionsChanged = records().some((cell) => {
        const row = getCurrentRow(cell.clientKey);
        if (!row) return false;
        const key = document.getLineKey(row);
        const replacement = next.columns.find(
          (column) => (column.id ?? column.accessorKey) === cell.columnId,
        );
        return (
          (columnFor(cell.columnId)?.edit?.canEdit?.(row, { selected: selectedIds.has(key) }) ??
            true) !==
          (replacement?.edit?.canEdit?.(row, { selected: nextSelected.has(key) }) ?? true)
        );
      });
      const nextBindings = ruleBindings(next.columns);
      const rulesChanged = !sameBindings(bindings, nextBindings);
      const ids = new Set(next.columns.map((column) => column.id ?? column.accessorKey));
      if (
        records().some(
          (cell) =>
            !ids.has(cell.columnId) && (!!cell.session.getFailure() || !!cell.editor?.isChanged()),
        )
      )
        throw new Error("Commit or discard draft edits before removing their columns");
      for (const cell of records()) {
        if (cell.session.getState().status === "idle") continue;
        const previous = columnFor(cell.columnId);
        const replacement = next.columns.find(
          (column) => (column.id ?? column.accessorKey) === cell.columnId,
        );
        if (
          replacement &&
          (previous?.accessorKey !== replacement.accessorKey ||
            (replacement.edit &&
              cell.editor?.editorType &&
              replacement.edit.editorType !== cell.editor.editorType))
        )
          throw new Error(
            "Commit or discard draft edits before changing their value source or editor type",
          );
      }
      document.setColumns(next.columns);
      if (
        rulesChanged ||
        options.validate !== next.validate ||
        permissionsChanged ||
        (options.orderer ?? "manual") !== (next.orderer ?? "manual")
      ) {
        version++;
        invalidatePreparation();
      }
      for (const cell of records()) {
        const state = cell.session.getState();
        const replacement = next.columns.find(
          (column) => (column.id ?? column.accessorKey) === cell.columnId,
        );
        if (
          state.status !== "idle" &&
          columnFor(cell.columnId)?.edit?.onValueCommitted !== replacement?.edit?.onValueCommitted
        )
          cell.session.change(state.draft);
      }
      bindings = nextBindings;
      options = next;
      selectedIds = nextSelected;
      const comparator = sortState && columnFor(sortState.columnId)?.sort?.comparator;
      if (sortState && !comparator) sortState = undefined;
      for (const cell of records()) {
        const column = columnFor(cell.columnId);
        const row = getCurrentRow(cell.clientKey);
        const editable =
          row &&
          column?.edit &&
          (column.edit.canEdit?.(row, { selected: selectedIds.has(document.getLineKey(row)) }) ??
            true);
        if (column && !editable && cell.session.getState().status === "editing")
          void cell.editor?.commit();
      }
      if (hasUnsavedChanges() !== lastUnsaved || previousComparator !== comparator) emit();
      for (const rowCells of cells.values()) {
        for (const [id, cell] of rowCells) {
          if (ids.has(id)) {
            if (active) cell.session.activate(columnFor(id)?.edit?.error !== false);
            continue;
          }
          cell.detach();
          cell.session.deactivate();
          rowCells.delete(id);
        }
      }
    },
    activate() {
      active = true;
      for (const cell of records())
        cell.session.activate(columnFor(cell.columnId)?.edit?.error !== false);
    },
    deactivate() {
      active = false;
      version++;
      invalidatePreparation();
      for (const cell of records()) cell.session.deactivate();
    },
    commands: {
      getCellError: (lineKey: string, columnId: string) =>
        errors.find(
          (error) =>
            error.scope === "cell" && error.lineKey === lineKey && error.columnId === columnId,
        )?.message,
      hasUnsavedChanges,
      getChangeSet: document.getChangeSet,
      commitEdits,
      reset(saved?: LineItemsResetInput<T>, resetOptions?: LineItemsResetOptions<T>) {
        document.reset(saved, resetOptions);
        if (!resetOptions?.sent) cancelCells(() => true);
        changed();
      },
      revert() {
        document.revert();
        cancelCells(() => true);
        changed();
      },
      addLines(lines: readonly T[], addOptions?: { afterLineKey?: string | null }) {
        const keys = document.addLines(lines, addOptions);
        if (keys.length > 0) changed();
        return keys;
      },
      addLine(line: T, addOptions?: { afterLineKey?: string | null }) {
        const [key] = document.addLines([line], addOptions);
        changed();
        return key!;
      },
      removeLines(lineKeys: readonly string[]) {
        const before = document.getRows();
        document.removeLines(lineKeys);
        if (document.getRows() !== before) changed();
      },
      removeLine(lineKey: string) {
        document.removeLines([lineKey]);
        changed();
      },
      updateLines,
      updateField<K extends keyof T>(lineKey: string, key: K, value: T[K]) {
        const patch: Partial<T> = {};
        patch[key] = value;
        updateLines([{ lineKey, patch }]);
      },
      reorderLine(lineKey: string, afterLineKey: string | null) {
        if (options.orderer === "readonly")
          throw new Error("Manual reordering is disabled by orderer: readonly");
        const before = document.getRows();
        // The first manual move adopts the complete sorted order, including search-hidden lines.
        document.reorder(
          lineKey,
          afterLineKey,
          sortState ? getRows().map(document.getLineKey) : undefined,
        );
        if (document.getRows() !== before || (sortState && lineKey !== afterLineKey)) {
          sortState = undefined;
          changed();
        }
      },
      getLineKey: document.getLineKey,
      isNewLine: document.isNewLine,
    },
  };
}

export type LineItemsController<T extends Record<string, unknown>> = ReturnType<
  typeof createLineItemsController<T>
>;

export function bindLineItemsController<T extends Record<string, unknown>>(
  value: UseLineItemsReturn<T>,
  controller: LineItemsController<T>,
) {
  controllers.set(value, controller);
}

export function getLineItemsController<T extends Record<string, unknown>>(
  value: UseLineItemsReturn<T>,
): LineItemsController<T> {
  const controller = controllers.get(value) as LineItemsController<T> | undefined;
  if (!controller) throw new Error("LineItems.Root requires a value returned by useLineItems");
  return controller;
}
