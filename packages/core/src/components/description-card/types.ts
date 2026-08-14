import type { CSSProperties, ReactNode } from "react";
import type { BadgeVariant } from "../badge-list";

// ============================================================================
// FIELD TYPES
// ============================================================================

/**
 * Supported field types for DescriptionCard
 */
export type FieldType = "text" | "badge" | "money" | "date" | "link" | "address" | "reference";

/**
 * @deprecated Use `BadgeVariant` from `@tailor-platform/app-shell` instead.
 */
export type BadgeVariantType = BadgeVariant;

/**
 * Behavior when a field value is empty/null/undefined
 */
export type EmptyBehavior = "dash" | "hide";

/**
 * Date format options
 */
export type DateFormat = "short" | "medium" | "long" | "relative";

// ============================================================================
// FIELD META
// ============================================================================

/**
 * Metadata for field-specific rendering options
 */
export interface FieldMeta {
  /** Show copy button for this field */
  copyable?: boolean;
  /** Map field values to badge variants */
  badgeVariantMap?: Record<string, BadgeVariant>;
  /**
   * Maps each value (stringified) to a display label. Values not in the
   * map render the raw value (or sentence-cased value if enabled).
   */
  badgeLabelMap?: Record<string, string>;
  /** Variant used when the value is not in `badgeVariantMap`. Default: `"outline-neutral"` (from shared `resolveBadgeVariant`). */
  defaultBadgeVariant?: BadgeVariant;
  /** Render badge labels in sentence case by default; set false to keep the original value */
  sentenceCaseBadges?: boolean;
  /** Maximum number of badges to display before showing a "+N" overflow indicator */
  maxVisible?: number;
  /** Key path to currency code in data object (for money fields) */
  currencyKey?: string;
  /** Key path to href in data object (for link fields) */
  hrefKey?: string;
  /** Whether the link opens in a new tab */
  external?: boolean;
  /** Date format style */
  dateFormat?: DateFormat;
  /** Key path to reference document ID */
  referenceIdKey?: string;
  /** Base URL pattern for reference links (use {id} as placeholder) */
  referenceUrlPattern?: string;
  /** Tooltip text */
  tooltip?: string;
  /** Truncate text after this many lines (shows tooltip with full text) */
  truncateLines?: number;
}

// ============================================================================
// FIELD CONFIG (Discriminated Union)
// ============================================================================

/**
 * A field configuration - either a divider or a field definition
 */
export type FieldConfig<TData extends object = Record<string, unknown>> =
  | FieldDivider
  | FieldDefinition<TData>;

/**
 * Divider - creates a horizontal line between sections
 */
export interface FieldDivider {
  type: "divider";
}

/**
 * Renders the value for a field.
 *
 * Receives the resolved value at `key` (dot notation is applied first) and the
 * full `data` object, so a field can draw itself from related keys.
 */
export type FieldRender<TData extends object = Record<string, unknown>> = (
  value: unknown,
  data: TData,
) => ReactNode;

/**
 * Field definition - renders a key-value pair
 */
export interface FieldDefinition<TData extends object = Record<string, unknown>> {
  /** Field type determines rendering (defaults to "text") */
  type?: FieldType;
  /** Path to the value in the data object (supports dot notation) */
  key: string;
  /** Display label for the field */
  label: string;
  /** Type-specific metadata */
  meta?: FieldMeta;
  /** Behavior when value is empty (defaults to "dash") */
  emptyBehavior?: EmptyBehavior;
  /**
   * Renders the value yourself instead of using a built-in `type` renderer.
   *
   * Always wins when both are present, and its return value replaces the
   * built-in output entirely - `meta` (copy button, truncation, badge maps,
   * …) is not applied, so a custom renderer owns its own presentation.
   *
   * Called even when the value is empty, so the renderer decides how to
   * display that. `emptyBehavior: "hide"` still removes the field first.
   *
   * Mirrors `render` on DataTable's `Column`.
   */
  render?: FieldRender<TData>;
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

/**
 * Column layout options for the card
 */
export type Columns = 3 | 4;

/**
 * Props for the DescriptionCard component
 *
 * `TData` is inferred from `data`, which types the second argument passed to a
 * field's `render`. It is constrained to `object` rather than
 * `Record<string, unknown>` so `interface`-typed data is accepted - interfaces
 * have no implicit index signature.
 */
export interface DescriptionCardProps<TData extends object = Record<string, unknown>> {
  /** Raw backend data object */
  data: TData;
  /** Card title */
  title: string;
  /** Ordered list of field definitions (use { type: "divider" } for dividers) */
  fields: FieldConfig<TData>[];
  /** Number of columns on desktop (3 or 4) */
  columns?: Columns;
  /** Additional CSS classes */
  className?: string;
  /** Inline styles */
  style?: CSSProperties;
  /** Header action slot (e.g., edit button) */
  headerAction?: ReactNode;
}

// ============================================================================
// RESOLVED FIELD (Internal)
// ============================================================================

/**
 * A resolved field ready for rendering
 */
export interface ResolvedField {
  /** Unique key for React */
  id: string;
  /** Display label */
  label: string;
  /** Field type */
  type: FieldType;
  /** Resolved value from data */
  value: unknown;
  /** Empty behavior */
  emptyBehavior: EmptyBehavior;
  /** Field metadata */
  meta?: FieldMeta;
  /** Full data object (for accessing related keys) */
  data: Record<string, unknown>;
  /**
   * Custom renderer, pre-bound to this field's value and the original
   * (still correctly-typed) data object at resolve time. Binding here keeps
   * `ResolvedField` free of a `TData` parameter without an unsound cast.
   */
  render?: () => ReactNode;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if a field config is a divider
 */
export function isDivider<TData extends object>(field: FieldConfig<TData>): field is FieldDivider {
  return field.type === "divider";
}

/**
 * Check if a field config is a field definition
 */
export function isFieldDefinition<TData extends object>(
  field: FieldConfig<TData>,
): field is FieldDefinition<TData> {
  return field.type !== "divider" && "key" in field;
}
