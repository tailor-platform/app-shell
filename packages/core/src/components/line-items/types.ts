import type { LineItemsColumn } from "./document";

/** Initial document ownership and row commands; cell editors and persistence are not yet supported. */
export type UseLineItemsOptions<TRow extends Record<string, unknown>> = {
  columns: readonly LineItemsColumn<TRow>[];
  /** Read once. ID-less rows are unsaved creations and are removed by revert. Remount the hook's owner to display another document. */
  defaultLines?: readonly TRow[];
  /** Server identity property; missing IDs receive stable client-only keys. Defaults to id. */
  idKey?: keyof TRow & string;
  /** Enables manual row movement. Defaults to true; false does not restrict other row commands. */
  orderer?: boolean;
};

export type UseLineItemsReturn<TRow extends Record<string, unknown>> = {
  readonly columns: readonly LineItemsColumn<TRow>[];
  readonly lines: readonly TRow[];
  readonly orderer: boolean;
  /** Changes to persisted rows or the presence of unsaved creations. */
  readonly isDirty: boolean;
  getLineKey: (row: TRow) => string;
  /** Updates a property owned by an accessorKey column; server identity cannot change. */
  updateField: <K extends keyof TRow & string>(lineKey: string, key: K, value: TRow[K]) => void;
  /** Appends a new creation, removing any server ID from the supplied row. */
  addLine: (line: TRow) => string;
  removeLine: (lineKey: string) => void;
  /** Moves a line after another current line; null moves it to the front. Requires orderer: true. */
  reorderLine: (lineKey: string, afterLineKey: string | null) => void;
  /** Restores persisted initial rows and discards every unsaved creation. */
  revert: () => void;
};
