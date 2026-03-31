import type { ReactNode } from "react";
import type {
  Column,
  ColumnOptions,
  FilterConfig,
  MetadataFieldOptions,
  SortConfig,
  TableFieldName,
  TableMetadata,
} from "./types";
import { fieldTypeToFilterConfig, fieldTypeToSortConfig } from "./types";

// =============================================================================
// column() helper
// =============================================================================

/**
 * Define a column with explicit render and optional sort/filter/accessor.
 */
export function column<TRow extends Record<string, unknown>>(
  options: ColumnOptions<TRow>,
): Column<TRow> {
  return {
    label: options.label,
    render: options.render,
    id: options.id,
    width: options.width,
    accessor: options.accessor,
    sort: options.sort,
    filter: options.filter,
  };
}

// =============================================================================
// inferColumns() — metadata-driven column defaults
// =============================================================================

function formatValue(value: unknown): ReactNode {
  if (value == null) return "";
  if (typeof value === "boolean") return value ? "✓" : "✗";
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Return a function that produces `ColumnOptions` from metadata field names.
 *
 * @example
 * ```tsx
 * const infer = inferColumns<OrderRow>(tableMetadata.order);
 * const columns = [
 *   column(infer("title")),
 *   column({ ...infer("status"), render: (row) => <StatusBadge value={row.status} /> }),
 * ];
 * ```
 */
export function inferColumns<
  TRow extends Record<string, unknown>,
  const TTable extends TableMetadata = TableMetadata,
>(
  tableMetadata: TTable,
): (dataKey: TableFieldName<TTable>, options?: MetadataFieldOptions) => ColumnOptions<TRow> {
  const fields = tableMetadata.fields;

  return (
    dataKey: TableFieldName<TTable>,
    columnOptions?: MetadataFieldOptions,
  ): ColumnOptions<TRow> => {
    const fieldName = dataKey as string;
    const fieldMeta = fields.find((f) => f.name === fieldName);
    if (!fieldMeta) {
      throw new Error(`Field "${fieldName}" not found in table "${tableMetadata.name}" metadata`);
    }

    let sort: SortConfig | undefined;
    if (columnOptions?.sort !== false) {
      sort = fieldTypeToSortConfig(fieldName, fieldMeta.type);
    }
    if (columnOptions?.sort === false) {
      sort = undefined;
    }

    let filter: FilterConfig | undefined;
    if (columnOptions?.filter !== false) {
      filter = fieldTypeToFilterConfig(fieldName, fieldMeta.type, fieldMeta.enumValues);
    }
    if (columnOptions?.filter === false) {
      filter = undefined;
    }

    const label = columnOptions?.label ?? fieldMeta.description ?? fieldMeta.name;

    return {
      label,
      render: ((row: Record<string, unknown>) => formatValue(row[fieldName])) as (
        row: TRow,
      ) => ReactNode,
      accessor: ((row: Record<string, unknown>) => row[fieldName]) as (row: TRow) => unknown,
      width: columnOptions?.width,
      sort,
      filter,
    };
  };
}

// =============================================================================
// createColumnHelper() — factory with TRow bound once
// =============================================================================

/**
 * Factory that captures the row type once and returns `column` and `inferColumns`
 * with `TRow` already bound.
 *
 * @example
 * ```tsx
 * const { column, inferColumns } = createColumnHelper<Order>();
 *
 * const infer = inferColumns(tableMetadata.order);
 * const columns = [
 *   column(infer("title")),
 *   column({ label: "Actions", render: (row) => <button>Edit {row.name}</button> }),
 * ];
 * ```
 */
export function createColumnHelper<TRow extends Record<string, unknown>>(): {
  column: (options: ColumnOptions<TRow>) => Column<TRow>;
  inferColumns: <const TTable extends TableMetadata = TableMetadata>(
    tableMetadata: TTable,
  ) => (dataKey: TableFieldName<TTable>, options?: MetadataFieldOptions) => ColumnOptions<TRow>;
} {
  return {
    column: (options: ColumnOptions<TRow>) => column<TRow>(options),
    inferColumns: <const TTable extends TableMetadata = TableMetadata>(tableMetadata: TTable) =>
      inferColumns<TRow, TTable>(tableMetadata),
  };
}
