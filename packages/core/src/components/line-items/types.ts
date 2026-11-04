import type { ReactNode } from "react";
import type { AsyncFetcher } from "@/hooks/use-async-items";
import type { RowSelectionOptions } from "@/components/internals/table-core/selection-types";
import type {
  ColumnCellType,
  ColumnDisplay,
  ColumnDisplayProps,
  ColumnDisplayTypes,
  TypedColumnDisplay,
} from "@/components/internals/table-core/column-types";

export type LineItemsMode = "view" | "edit" | "amend";

type EditorBase<TRow extends Record<string, unknown>, TValue> = {
  /** Optional check before internal adoption. Throw/reject retains the draft; normal completion adopts it. */
  onValueCommitted?: (row: Readonly<TRow>, value: TValue) => void | Promise<void>;
  /** Omitted means edit only; view is never an editable mode. */
  modes?: readonly Exclude<LineItemsMode, "view">[];
  error?: false | { render: (ctx: { row: TRow; error: unknown }) => ReactNode };
};

export type LineItemsOption<TValue extends string | number> = {
  value: TValue;
  label: string;
  description?: string;
};

export interface LineItemsCustomEditorContext<TRow extends Record<string, unknown>, TValue> {
  value: TValue;
  onCommit: (next: TValue) => void;
  onCancel: () => void;
  row: Readonly<TRow>;
  mode: LineItemsMode;
  ariaLabel: string;
}

type Adoptable<TOutput, TValue, TEditor> = [TOutput] extends [TValue] ? TEditor : never;

type ChoiceEditor<TRow extends Record<string, unknown>, TValue extends string | number> =
  | {
      editorType: "combobox";
      options: readonly LineItemsOption<TValue>[];
      fetcher?: never;
      getOptionLabel?: never;
      placeholder?: string;
    }
  | {
      editorType: "combobox";
      options?: never;
      fetcher: AsyncFetcher<LineItemsOption<TValue>>;
      /** Editor label for a current value not present in the search results. */
      getOptionLabel: (value: TValue, row: TRow) => string;
      placeholder?: string;
    };

export type LineItemsEditor<TRow extends Record<string, unknown>, TValue> =
  | Adoptable<string | null, TValue, EditorBase<TRow, string | null> & { editorType: "text" }>
  | Adoptable<number | null, TValue, EditorBase<TRow, number | null> & { editorType: "number" }>
  | Adoptable<boolean, TValue, EditorBase<TRow, boolean> & { editorType: "boolean" }>
  | ([TValue] extends [string | null | undefined]
      ? Adoptable<
          string | null,
          TValue,
          EditorBase<TRow, string | null> & { editorType: "date"; min?: string; max?: string }
        >
      : never)
  | (null extends TValue
      ? [Extract<TValue, string | number>] extends [never]
        ? never
        : EditorBase<TRow, Extract<TValue, string | number> | null> &
            ChoiceEditor<TRow, Extract<TValue, string | number>>
      : never)
  | (EditorBase<TRow, TValue> & {
      editorType: "custom";
      renderEditor: (ctx: LineItemsCustomEditorContext<TRow, TValue>) => ReactNode;
    });

type DocumentRules<TRow extends Record<string, unknown>, TValue> = {
  /** Adopted at every data boundary, not during display or diff calculation. */
  normalize?: (value: TValue, row: Readonly<TRow>) => TValue;
  equals?: (left: TValue, right: TValue, row: Readonly<TRow>) => boolean;
  commit?: "document" | "metadata";
};

type NoDocumentRules = {
  edit?: never;
  normalize?: never;
  equals?: never;
  commit?: never;
};

type LineItemsColumnProps<TRow extends Record<string, unknown>> = ColumnDisplayProps<TRow> & {
  sort?: { comparator: (left: TRow, right: TRow) => number };
  /** Overrides default value matching; receives the trimmed, NFKC/lowercase query. */
  search?: (row: TRow, query: string) => boolean;
  /** Collection filters belong to DataTable, not a document's local columns. */
  filter?: never;
};

type PropertyColumn<TRow extends Record<string, unknown>> = {
  [K in keyof TRow & string]: LineItemsColumnProps<TRow> &
    ColumnDisplay<TRow, TRow[K]> &
    DocumentRules<TRow, TRow[K]> & {
      accessorKey: K;
      accessor?: never;
      id?: string;
      edit?: LineItemsEditor<TRow, TRow[K]>;
    };
}[keyof TRow & string];

type ComputedColumn<TRow extends Record<string, unknown>> = LineItemsColumnProps<TRow> &
  NoDocumentRules & {
    id: string;
    accessorKey?: never;
  } & (
    | { type?: undefined; typeOptions?: never; accessor: (row: TRow) => unknown }
    | {
        [K in ColumnCellType]: TypedColumnDisplay<TRow, K> & {
          accessor: (row: TRow) => ColumnDisplayTypes<TRow>[K]["value"];
        };
      }[ColumnCellType]
  );

type SourceLessColumn<TRow extends Record<string, unknown>> = LineItemsColumnProps<TRow> &
  ColumnDisplay<TRow, undefined> &
  NoDocumentRules & {
    id: string;
    accessorKey?: never;
    accessor?: never;
  };

/** A document column: property, computed value, or explicitly value-less display. */
export type LineItemsColumn<TRow extends Record<string, unknown>> =
  | PropertyColumn<TRow>
  | ComputedColumn<TRow>
  | SourceLessColumn<TRow>;

/** A stable server reference or a client-only creation reference in manual order. */
export type LineItemsLineRef =
  | { readonly lineId: string; readonly tempId?: never }
  | { readonly tempId: string; readonly lineId?: never };

export type LineItemsLineChange<T extends Record<string, unknown>> =
  | { readonly action: "add"; readonly tempId: string; readonly data: Readonly<Partial<T>> }
  | { readonly action: "update"; readonly lineId: string; readonly patch: Readonly<Partial<T>> }
  | { readonly action: "remove"; readonly lineId: string };

/** A transport-neutral immutable view of one submitted document state. */
export type LineItemsChangeSet<T extends Record<string, unknown>> = {
  readonly isEmpty: boolean;
  readonly lineChanges: readonly LineItemsLineChange<T>[];
  /** Authoritative final order, including new rows; only present for changed manual order. */
  readonly order?: readonly LineItemsLineRef[];
};

export type LineItemsCellError = {
  readonly lineKey: string;
  readonly columnId: string;
  readonly message: string;
};

/** Business validation can target the document as a whole or one cell. */
export type LineItemsValidationIssue =
  | { readonly scope: "document"; readonly message: string }
  | ({ readonly scope: "cell" } & LineItemsCellError);

export type LineItemsResetInput<T extends Record<string, unknown>> =
  | readonly T[]
  | { readonly idMap: Readonly<Record<string, string | number>> };

export type LineItemsResetOptions<T extends Record<string, unknown>> = {
  readonly sent?: LineItemsChangeSet<T>;
  /** Required when canonical server rows acknowledge new lines. Never inferred from row order. */
  readonly idMap?: Readonly<Record<string, string | number>>;
};

export type LineItemsRowActions<TRow extends Record<string, unknown>> = {
  render: (row: TRow, context: { lineKey: string; isNew: boolean; index: number }) => ReactNode;
  width?: number;
};

/** Initial document-owned API. Controlled rows and metadata persistence are not yet supported. */
export type UseLineItemsOptions<TRow extends Record<string, unknown>> = {
  columns: readonly LineItemsColumn<TRow>[];
  /** Runs after cell confirmation, on all document lines. Validation failures return issues; unexpected errors throw. */
  validate?: (
    lines: readonly Readonly<TRow>[],
    context: { getLineKey: (line: Readonly<TRow>) => string },
  ) => readonly LineItemsValidationIssue[] | Promise<readonly LineItemsValidationIssue[]>;
  /** Read once. Remount with a different React key to edit another document. */
  defaultLines?: readonly TRow[];
  idKey?: keyof TRow & string;
  mode?: LineItemsMode;
  /** Manual ordering adds Table drag handles outside view mode. Read once; remount to change. */
  ordering?: "sort" | "manual";
  rowActions?: LineItemsRowActions<TRow>;
  /** DataTable-compatible controlled/uncontrolled selection and bulk actions. IDs are public line keys. */
  rowSelection?: RowSelectionOptions;
  /** Browser-local column order/pin preferences, independent of document saves. */
  tableId?: string;
};

export type UseLineItemsReturn<TRow extends Record<string, unknown>> = {
  /** Rows matching the current search, in document order. */
  readonly lines: readonly TRow[];
  /** Complete document, independent of presentation search. */
  readonly allLines: readonly TRow[];
  readonly searchQuery: string;
  setSearchQuery: (query: string) => void;
  readonly columns: readonly LineItemsColumn<TRow>[];
  readonly columnOrder: readonly string[];
  readonly pinnedColumns: Readonly<Record<string, "left" | "right" | "none">>;
  moveColumn: (columnId: string, toIndex: number) => void;
  setColumnOrder: (columnIds: readonly string[]) => void;
  setPin: (columnId: string, side: "left" | "right" | "none" | null) => void;
  readonly mode: LineItemsMode;
  readonly ordering: "sort" | "manual";
  readonly rowActions: LineItemsRowActions<TRow> | undefined;
  rowSelection?: RowSelectionOptions;
  selectedIds: string[];
  isRowSelected: (row: TRow) => boolean;
  toggleRowSelection?: (row: TRow) => void;
  /** Select only the current search matches; retain hidden selections. */
  selectAllRows?: () => void;
  deselectAllRows?: () => void;
  clearSelection?: () => void;
  pendingActionId?: string | null;
  runSelectionAction?: (action: { id: string }, request: PromiseLike<unknown>) => void;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  readonly isDirty: boolean;
  /** Results from the last current save preparation; document changes discard them. */
  readonly errors: readonly LineItemsValidationIssue[];
  getCellError: (lineKey: string, columnId: string) => string | undefined;
  hasUnsavedChanges: () => boolean;
  getChangeSet: () => LineItemsChangeSet<TRow>;
  /** Confirms drafts and validates before returning an immutable transport snapshot. */
  commitEdits: () => Promise<LineItemsChangeSet<TRow> | null>;
  reset: (saved?: LineItemsResetInput<TRow>, options?: LineItemsResetOptions<TRow>) => void;
  revert: () => void;
  addLine: (line: TRow, options?: { afterLineKey?: string | null }) => string;
  addLines: (lines: readonly TRow[], options?: { afterLineKey?: string | null }) => string[];
  removeLine: (lineKey: string) => void;
  removeLines: (lineKeys: readonly string[]) => void;
  updateField: <K extends keyof TRow>(lineKey: string, key: K, value: TRow[K]) => void;
  updateLines: (patches: readonly { lineKey: string; patch: Partial<TRow> }[]) => void;
  reorderLine: (lineKey: string, afterLineKey: string | null) => void;
  getLineKey: (line: TRow) => string;
  isNewLine: (line: TRow) => boolean;
};
