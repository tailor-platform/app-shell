import type { ReactNode } from "react";
import type {
  FieldTypeToFilterConfigType,
  FilterConfig,
  SortConfig,
  TableFieldName,
  TableMetadata,
} from "@/types/collection";
import { fieldTypeToFilterConfig, fieldTypeToSortConfig } from "@/types/collection";
import type { Column, ColumnBase, FooterRenderContext, MetadataFieldOptions } from "./types";
import type { AGGREGATION, Aggregation, AggregationDefinition } from "@/lib/aggregations";

// =============================================================================
// column() helper
// =============================================================================

/**
 * Define a column with explicit render and optional sort/filter/accessor.
 * Prefer {@link createColumnHelper} to bind `TRow` once at the helper level.
 */
export function column<TRow extends Record<string, unknown>>(options: Column<TRow>): Column<TRow> {
  // Spread to keep `Column<TRow>` a discriminated union — an explicit field
  // list would widen `type` / `typeOptions` and lose the branch relationship.
  return { ...options };
}

// =============================================================================
// inferColumns() — metadata-driven column defaults
// =============================================================================

type InferredFieldFilterType<
  TTable extends TableMetadata,
  TFieldName extends TableFieldName<TTable>,
> =
  Extract<TTable["fields"][number], { readonly name: TFieldName }> extends {
    readonly type: infer TType;
  }
    ? TType extends keyof FieldTypeToFilterConfigType
      ? FieldTypeToFilterConfigType[TType]
      : never
    : never;

type MetadataFieldOptionsForField<
  TTable extends TableMetadata,
  TFieldName extends TableFieldName<TTable>,
> = MetadataFieldOptions<
  [InferredFieldFilterType<TTable, TFieldName>] extends [never]
    ? FilterConfig["type"]
    : InferredFieldFilterType<TTable, TFieldName>
>;

/**
 * Return a function that produces `Column` from metadata field names.
 * Prefer {@link createColumnHelper} to bind `TRow` once at the helper level.
 */
function inferColumns<
  TRow extends Record<string, unknown>,
  const TTable extends TableMetadata = TableMetadata,
>(tableMetadata: TTable): ColumnInferFn<TRow, TTable> {
  const fields = tableMetadata.fields;

  return <TFieldName extends TableFieldName<TTable>>(
    dataKey: TFieldName,
    columnOptions?: MetadataFieldOptionsForField<TTable, NoInfer<TFieldName>>,
  ): InferredColumn<TRow> & { id: TFieldName } => {
    const fieldName = dataKey as string;
    const fieldMeta = fields.find((f) => f.name === fieldName);
    if (!fieldMeta) {
      throw new Error(`Field "${fieldName}" not found in table "${tableMetadata.name}" metadata`);
    }

    let sort: SortConfig | undefined;
    if (columnOptions?.sort !== false) {
      sort = fieldTypeToSortConfig(fieldName, fieldMeta.type);
    }

    let filter: ColumnBase<TRow>["filter"];
    const filterOption = columnOptions?.filter;
    if (filterOption !== false) {
      const baseFilter = fieldTypeToFilterConfig(fieldName, fieldMeta.type, fieldMeta.enumValues);
      if (baseFilter) {
        filter = typeof filterOption === "object" ? { ...baseFilter, ...filterOption } : baseFilter;
      }
    }

    const label = columnOptions?.label ?? fieldMeta.description ?? fieldMeta.name;

    return {
      // Pin `id` to the field name so the cell renderer's `row[col.id]`
      // fallback resolves to the same value the inferred `render` reads.
      // This is what lets `column({ ...infer("description"), truncate: true })`
      // wire the truncate tooltip without an explicit `accessor` —
      // `getCellValue` falls through to `row[col.id]`.
      id: dataKey,
      label,
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
 * The return type of an infer function — contains the base column fields
 * without the discriminated `type`/`typeOptions`/`accessor` branches.
 *
 * This makes spread-then-override patterns like
 * `column({ ...infer("stock"), type: "number" })` type-safe without
 * requiring an explicit accessor cast.
 */
export type InferredColumn<TRow extends Record<string, unknown>> = ColumnBase<TRow>;

/**
 * Per-field column factory returned by `inferColumns(tableMetadata)`.
 *
 * Derives label, sort config, and filter config from the field's metadata.
 * Sort can be suppressed and filter can be suppressed or narrowed per call via `options`.
 *
 * @param dataKey - A field name from the bound table metadata.
 * @param options - Optional per-column overrides (label, width, sort, filter).
 * @throws {Error} If `dataKey` is not found in the metadata passed to `inferColumns`.
 */
export type ColumnInferFn<
  TRow extends Record<string, unknown>,
  TTable extends TableMetadata = TableMetadata,
> = <TFieldName extends TableFieldName<TTable>>(
  dataKey: TFieldName,
  options?: MetadataFieldOptionsForField<TTable, NoInfer<TFieldName>>,
) => InferredColumn<TRow> & { id: TFieldName };

type ColumnFieldValue<TRow, TColumn> = TColumn extends { id: infer TKey }
  ? TKey extends keyof TRow
    ? TRow[TKey]
    : unknown
  : unknown;

type AccessorValue<TRow, TColumn, TAccessor> = TAccessor extends (row: TRow) => infer TValue
  ? TValue
  : ColumnFieldValue<TRow, TColumn>;

type AggregationSource<TRow, TColumn> = TColumn extends { accessor: infer TAccessor }
  ? AccessorValue<TRow, TColumn, TAccessor>
  : TColumn extends { accessor?: infer TAccessor }
    ? AccessorValue<TRow, TColumn, TAccessor> | ColumnFieldValue<TRow, TColumn>
    : ColumnFieldValue<TRow, TColumn>;

type IsNumericSource<TValue> = 0 extends 1 & TValue
  ? false
  : [NonNullable<TValue>] extends [never]
    ? false
    : [NonNullable<TValue>] extends [number]
      ? true
      : false;

type ConcreteAggregationKinds<TColumn> = TColumn extends { footer?: infer TFooter }
  ? Extract<TFooter, Aggregation<unknown>>[typeof AGGREGATION]["kind"]
  : never;

type InvalidAggregationColumns<TRow, TColumn> = TColumn extends unknown
  ? [Exclude<ConcreteAggregationKinds<TColumn>, "count">] extends [never]
    ? never
    : IsNumericSource<AggregationSource<TRow, TColumn>> extends true
      ? never
      : TColumn
  : never;

// Collect failures before validating the union so a valid alternative cannot erase them.
type ValidateAggregation<TRow, TColumn> = [InvalidAggregationColumns<TRow, TColumn>] extends [never]
  ? unknown
  : { readonly __numericAggregationRequiresNumber: never };

type PlainFooterRenderer<TRow extends Record<string, unknown>> = ((
  ctx: FooterRenderContext<TRow>,
) => ReactNode) & { readonly [AGGREGATION]?: never };

type UnionKeys<T> = T extends unknown ? keyof T : never;
type NoExtraKeys<TActual, TExpected> =
  Exclude<keyof TActual, UnionKeys<TExpected>> extends never
    ? unknown
    : { [TKey in Exclude<keyof TActual, UnionKeys<TExpected>>]: never };

type ApplicableColumn<TRow extends Record<string, unknown>, TColumn> = TColumn extends {
  type: infer TType;
}
  ? Extract<Column<TRow>, { type: TType }>
  : Extract<Column<TRow>, { type?: undefined }>;

type ValidateOptionProperty<TColumn, TKey extends PropertyKey, TAllowed> =
  TColumn extends Record<TKey, infer TActual>
    ? { [TProperty in TKey]: NoExtraKeys<TActual, TAllowed> }
    : unknown;

// Generic inference must not make unsupported column/editor options appear valid.
type ValidateColumnOptions<TRow extends Record<string, unknown>, TColumn> = NoExtraKeys<
  TColumn,
  Column<TRow>
> &
  ValidateOptionProperty<TColumn, "edit", NonNullable<ApplicableColumn<TRow, TColumn>["edit"]>> &
  ValidateOptionProperty<
    TColumn,
    "typeOptions",
    NonNullable<ApplicableColumn<TRow, TColumn>["typeOptions"]>
  >;

/**
 * Object returned by `createColumnHelper`.
 */
export interface ColumnHelper<TRow extends Record<string, unknown>> {
  /**
   * Define a column. Numeric aggregation definitions retain their concrete
   * configuration to check the accessor result or row field type.
   * Direct or previously widened `Column<TRow>` definitions are not checked.
   *
   * @example
   * ```tsx
   * column({ label: "Name", render: (row) => row.name })
   * column({ label: "Actions", render: (row) => <button>Edit {row.name}</button> })
   * ```
   */
  column: {
    // Keep legacy excess-property checks separate from aggregation inference.
    (
      options: Column<TRow> & {
        footer?: string | PlainFooterRenderer<TRow> | AggregationDefinition<ReactNode, "count">;
      },
    ): Column<TRow>;
    <const TColumn extends Column<TRow>>(
      options: TColumn & ValidateAggregation<TRow, TColumn> & ValidateColumnOptions<TRow, TColumn>,
    ): TColumn & Column<TRow>;
  };
  /**
   * Bind table metadata once and return a per-field column factory.
   *
   * The returned factory **throws at call time** if the given field name is not
   * found in `tableMetadata`. This typically happens at module initialisation
   * (i.e. when columns are defined outside a component), so it surfaces as an
   * uncaught error rather than a render error. Field-name narrowing is only
   * active when `tableMetadata` is typed from an `as const` source (e.g. a
   * file generated by `appShellMetadataPlugin`).
   *
   * @throws {Error} If the field name is not found in the provided table metadata.
   *
   * @example
   * ```tsx
   * const infer = inferColumns(tableMetadata.order);
   * const columns = [
   *   column(infer("title")),
   *   column({
   *     ...infer("status"),
   *     render: (row) => <StatusBadge value={row.status} />
   *   }),
   * ];
   * ```
   */
  inferColumns: <const TTable extends TableMetadata = TableMetadata>(
    tableMetadata: TTable,
  ) => ColumnInferFn<TRow, TTable>;
}

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
export function createColumnHelper<TRow extends Record<string, unknown>>(): ColumnHelper<TRow> {
  return {
    column: <const TColumn extends Column<TRow>>(options: TColumn): TColumn => ({ ...options }),
    inferColumns: <const TTable extends TableMetadata = TableMetadata>(tableMetadata: TTable) =>
      inferColumns<TRow, TTable>(tableMetadata),
  };
}
