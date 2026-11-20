import type { LineItemsColumn } from "./document";
import type { LineItemsChangeset, LineItemsIdentityOptions } from "./document/types";
import type { LINE_ITEMS_EDITING } from "./editing";

export type { LineItemsChangeset, LineItemsColumn, LineItemsEditor } from "./document/types";

/** Owns one local document, cell editing, and save preparation; consumers own persistence. */
export type UseLineItemsOptions<TRow extends Record<string, unknown>> = {
  columns: readonly LineItemsColumn<TRow>[];
  /** Read once. ID-less rows are unsaved creations and are removed by revert. Use replaceLines for confirmed data; remount the hook's owner to display another document. */
  defaultLines?: readonly TRow[];
  /** Enables manual row movement. Defaults to true; false does not restrict other row commands. */
  orderer?: boolean;
} & LineItemsIdentityOptions<TRow>;

export type UseLineItemsReturn<TRow extends Record<string, unknown>> = {
  /** Internal handle retained by object spread; not a second owner of row data. */
  readonly [LINE_ITEMS_EDITING]: object;
  readonly columns: readonly LineItemsColumn<TRow>[];
  readonly lines: readonly TRow[];
  readonly orderer: boolean;
  /** Adopted changes or unsaved creations; unconfirmed cell drafts are not included. */
  readonly isDirty: boolean;
  /** Side-effect-free net changes using this render's column equality; does not confirm drafts, validate, save, or advance the baseline. */
  getChanges: () => LineItemsChangeset<TRow>;
  /** Blocks new user edits and mutation commands throughout preparation and consumer-owned saving. */
  readonly isSaveLocked: boolean;
  /** Locks immediately, confirms drafts and awaits validation. Returns committed changes and stays locked on success; null means input failed and the lock was released. Never persists or advances the baseline. Throws on concurrent use or unexpected errors. */
  commitChanges: () => Promise<LineItemsChangeset<TRow> | null>;
  /** Adopts confirmed full data as both current rows and saved baseline, retiring old drafts. Every row requires a persisted ID. Does not release the save lock; unavailable during preparation. */
  replaceLines: (confirmedLines: readonly TRow[]) => void;
  /** Releases the save lock without changing data or baseline. Call in finally after successful preparation. Unavailable while preparation is running. */
  finishSave: () => void;
  getLineKey: (row: TRow) => string;
  /** Updates an accessorKey-owned property and discards its drafts; persisted identity cannot change. */
  updateField: <K extends keyof TRow & string>(lineKey: string, key: K, value: TRow[K]) => void;
  /** Appends a new creation without requiring an ID; removes any supplied persisted ID. */
  addLine: (line: TRow) => string;
  removeLine: (lineKey: string) => void;
  /** Moves a line after another current line; null moves it to the front. Requires orderer: true. */
  reorderLine: (lineKey: string, afterLineKey: string | null) => void;
  /** Restores the latest saved baseline and discards all unsaved creations and cell drafts. Unavailable while save-locked. */
  revert: () => void;
};
