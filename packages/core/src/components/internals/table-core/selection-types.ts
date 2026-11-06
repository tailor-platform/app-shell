import type { ReactNode } from "react";

/** Presentation shared by row actions and selection actions. */
export interface TableAction {
  id: string;
  label: string;
  icon?: ReactNode;
  variant?: "default" | "destructive";
}

export interface SelectionActionHelpers {
  /** Empty the complete selection, including hidden or unloaded rows. */
  clearSelection: () => void;
  /** Track a request started later, such as after a confirmation dialog. Does not clear selection. */
  run: <T>(request: PromiseLike<T>) => PromiseLike<T>;
}

/** A bulk action receives a click-time copy of public selected IDs. */
export interface SelectionAction extends TableAction {
  /**
   * Consumers own eligibility checks, confirmation, and execution. Selection is not
   * automatically cleared on success or failure. Return a promise (or use helpers.run)
   * to disable actions and Clear while the request is pending.
   */
  onClick: (ids: string[], helpers: SelectionActionHelpers) => void | Promise<unknown>;
}

/** Controlled or uncontrolled selection. Keep the ownership mode stable while mounted. */
export type RowSelectionOptions = {
  /** First three actions render inline; the rest appear in More actions. Omit for selection only. */
  actions?: SelectionAction[];
} & (
  | {
      /** Commands before an owner commit each derive from this array. */
      selectedIds: string[];
      onChange: (ids: string[]) => void;
      defaultSelectedIds?: never;
    }
  | {
      selectedIds?: never;
      /** Read once in uncontrolled mode. */
      defaultSelectedIds?: string[];
      /** User-driven changes notify once, including under StrictMode. */
      onChange?: (ids: string[]) => void;
    }
);
