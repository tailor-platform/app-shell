import { useState, useSyncExternalStore } from "react";

/**
 * A value the user left in a cell that breaks a rule. It stays on screen,
 * marked and with its message, and is never saved — until the user fixes it or
 * presses Esc. Kept per table rather than per cell, so it survives the cell
 * unmounting (paging away and back) and counts as unsaved when leaving the page.
 *
 * @internal
 */
export interface KeptDraft {
  /** The typed text, or a rejected pick's value. */
  value: unknown;
  /** Why it can't be saved. */
  message: string;
}

/**
 * What a table hasn't saved yet.
 *
 * @internal
 */
export interface CellEditStatus {
  /** Cells being typed into whose change isn't committed yet. */
  editing: number;
  /** Values left in cells that break a rule. */
  kept: number;
  /** Autosaves still in flight. */
  saving: number;
}

/**
 * The unsaved state of one rendered table body, shared by its editable cells
 * and the guard that warns before leaving the page.
 *
 * @internal
 */
export interface CellEditStore {
  getKept: (cellId: string) => KeptDraft | undefined;
  setKept: (cellId: string, draft: KeptDraft | undefined) => void;
  setEditing: (cellId: string, editing: boolean) => void;
  /** Counts an autosave as unsaved until it settles. */
  trackSave: (save: PromiseLike<unknown>) => void;
  /** Resolves once every autosave in flight settles: `true` when they all succeeded. */
  settle: () => Promise<boolean>;
  hasUnsaved: () => boolean;
  getStatus: () => CellEditStatus;
  subscribe: (listener: () => void) => () => void;
}

/** @internal */
export const cellEditId = (rowKey: string, colKey: string) => `${rowKey}\u0000${colKey}`;

/** @internal */
export function createCellEditStore(): CellEditStore {
  const kept = new Map<string, KeptDraft>();
  const editing = new Set<string>();
  const saves = new Set<Promise<boolean>>();
  const listeners = new Set<() => void>();
  // A stable snapshot for `useSyncExternalStore`: replaced only when a count changes.
  let status: CellEditStatus = { editing: 0, kept: 0, saving: 0 };

  const emit = () => {
    if (
      status.editing === editing.size &&
      status.kept === kept.size &&
      status.saving === saves.size
    ) {
      return;
    }
    status = { editing: editing.size, kept: kept.size, saving: saves.size };
    for (const listener of listeners) listener();
  };

  return {
    getKept: (cellId) => kept.get(cellId),
    setKept(cellId, draft) {
      if (draft) kept.set(cellId, draft);
      else kept.delete(cellId);
      emit();
    },
    setEditing(cellId, isEditing) {
      if (isEditing) editing.add(cellId);
      else editing.delete(cellId);
      emit();
    },
    trackSave(save) {
      const tracked: Promise<boolean> = Promise.resolve(save)
        .then(
          () => true,
          () => false,
        )
        .finally(() => {
          saves.delete(tracked);
          emit();
        });
      saves.add(tracked);
      emit();
    },
    async settle() {
      const results = await Promise.all(saves);
      return results.every(Boolean);
    },
    hasUnsaved: () => editing.size + kept.size + saves.size > 0,
    getStatus: () => status,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** One store per rendered table body. @internal */
export function useCellEditStore(): CellEditStore {
  const [store] = useState(createCellEditStore);
  return store;
}

/** Re-renders when the store's counts change. @internal */
export function useCellEditStatus(store: CellEditStore): CellEditStatus {
  return useSyncExternalStore(store.subscribe, store.getStatus, store.getStatus);
}
