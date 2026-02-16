// ============================================================================
// FIELD TYPES
// ============================================================================

/**
 * Supported field types for DescriptionCard
 */
export type FieldType =
  | "text"
  | "badge"
  | "money"
  | "date"
  | "link"
  | "address"
  | "reference";

/**
 * Badge variant mapping for automatic status coloring
 */
export type BadgeVariantType =
  | "default"
  | "success"
  | "warning"
  | "error"
  | "neutral"
  | "outline-success"
  | "outline-warning"
  | "outline-error"
  | "outline-info"
  | "outline-neutral";

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
  badgeVariantMap?: Record<string, BadgeVariantType>;
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
export type FieldConfig = FieldDivider | FieldDefinition;

/**
 * Divider - creates a horizontal line between sections
 */
export interface FieldDivider {
  type: "divider";
}

/**
 * Field definition - renders a key-value pair
 */
export interface FieldDefinition {
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
 */
export interface DescriptionCardProps {
  /** Raw backend data object */
  data: Record<string, unknown>;
  /** Card title */
  title: string;
  /** Ordered list of field definitions (use { type: "divider" } for dividers) */
  fields: FieldConfig[];
  /** Number of columns on desktop (3 or 4) */
  columns?: Columns;
  /** Additional CSS classes */
  className?: string;
  /** Header action slot (e.g., edit button) */
  headerAction?: React.ReactNode;
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
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if a field config is a divider
 */
export function isDivider(field: FieldConfig): field is FieldDivider {
  return field.type === "divider";
}

/**
 * Check if a field config is a field definition
 */
export function isFieldDefinition(field: FieldConfig): field is FieldDefinition {
  return field.type !== "divider" && "key" in field;
}
