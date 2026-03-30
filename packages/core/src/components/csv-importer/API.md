# CSV Importer — API Reference

## Quick Example

```tsx
import { CsvImporter, useCsvImporter, csv } from "@tailor-platform/app-shell";

const schema = {
  columns: [
    {
      key: "orderId",
      label: "Order ID",
      required: true,
      aliases: ["order_number", "PO番号"],
      schema: csv.string({ min: 1 }),
    },
    {
      key: "supplier",
      label: "Supplier",
      required: true,
      schema: csv.string({ min: 1 }),
    },
    {
      key: "amount",
      label: "Amount",
      schema: csv.number({ min: 0, max: 1_000_000 }),
    },
    {
      key: "status",
      label: "Status",
      schema: csv.enum(["pending", "approved", "rejected"]),
    },
  ],
} satisfies CsvSchema;

function PurchaseOrdersPage() {
  const csvImporter = useCsvImporter({
    schema,
    onValidate: async (rows) => {
      const res = await fetch("/api/purchase-orders/validate", {
        method: "POST",
        body: JSON.stringify(rows),
      });
      return res.json(); // CellError[]
    },
    onImport: async (event) => {
      const rows = await buildRows(event, schema);
      await fetch("/api/purchase-orders/import", {
        method: "POST",
        body: JSON.stringify(rows),
      });
    },
  });

  return (
    <>
      <button onClick={csvImporter.open}>Import CSV</button>
      <CsvImporter {...csvImporter.props} />
    </>
  );
}
```

## `useCsvImporter`

The hook that manages CSV importer state. Returns a trigger function and props to spread onto `<CsvImporter>`.

```ts
function useCsvImporter(options: UseCsvImporterOptions): {
  open: () => void;
  props: CsvImporterProps;
};
```

### `UseCsvImporterOptions`

```ts
type UseCsvImporterOptions = {
  /** Column definitions that drive mapping, transform, and validation. */
  schema: CsvSchema;

  /**
   * Called when the user confirms the import (after all validation passes).
   * Receives the original file, mappings, corrections, and summary.
   * Return a promise to show a loading indicator until complete.
   */
  onImport: (event: CsvImportEvent) => void | Promise<void>;

  /**
   * Optional async validation hook invoked at two gate points:
   * 1. Entering the Review step (after client-side schema validation runs)
   * 2. Pressing the Import button (after user edits)
   *
   * Returns cell-level errors/warnings in the same shape as client-side schema errors.
   * Use this for validations that require server round-trips:
   * uniqueness checks, foreign key resolution, upsert detection, etc.
   *
   * If omitted, only client-side `schema` validation is used.
   */
  onValidate?: (rows: ParsedRow[]) => Promise<CellError[]>;

  /** Maximum file size in bytes. Default: 10MB (10 * 1024 * 1024). */
  maxFileSize?: number;

  /** Override default UI text labels. Only the keys you provide are overridden. */
  labels?: Partial<CsvImporterLabels>;
};
```

## `<CsvImporter>`

Drawer-based component that renders the four-step import flow. Receives props from `useCsvImporter`.

```tsx
<CsvImporter {...csvImporter.props} />
```

The component is fully controlled by the hook — consumers don't pass props directly to `<CsvImporter>` beyond `{...csvImporter.props}`.

## Schema

### `CsvSchema`

```ts
type CsvSchema = {
  columns: CsvColumn[];
};
```

### `CsvColumn`

Defines a single expected field in the import.

```ts
type CsvColumn = {
  /** Internal key — becomes the property name in parsed rows and import results. */
  key: string;

  /** Display label shown in the mapping UI. */
  label: string;

  /** Optional description shown as a hint below the label in the mapping UI. */
  description?: string;

  /** Whether this column must be mapped to a CSV header. Default: false. */
  required?: boolean;

  /**
   * Alternative CSV header names for automatic matching.
   * Useful when the same field appears under different names across systems.
   * Matching is case-insensitive.
   * @example ["仕入先", "Vendor", "supplier_name"]
   */
  aliases?: string[];

  /**
   * A Standard Schema-compatible validator for this column.
   * Accepts any schema library that implements the Standard Schema spec
   * (zod, valibot, arktype, etc.).
   *
   * Handles both coercion (transform) and validation in a single declaration.
   * The raw CSV string is passed to `schema["~standard"].validate(value)`.
   * On success, the output value is used for the parsed row.
   * On failure, each issue is rendered as a cell error in the Review table.
   *
   * @see https://github.com/standard-schema/standard-schema
   * @example z.coerce.number().min(0).max(1_000_000)   // zod
   * @example v.pipe(v.string(), v.email())               // valibot
   */
  schema?: StandardSchemaV1;
};
```

### Standard Schema Integration

The `schema` field accepts any object implementing the [Standard Schema v1](https://github.com/standard-schema/standard-schema) interface. This provides a unified way to define coercion and validation using your preferred schema library:

| Library     | Example                         |
| ----------- | ------------------------------- |
| **zod**     | `z.coerce.number().min(0)`      |
| **valibot** | `v.pipe(v.string(), v.email())` |
| **arktype** | `type("string.email")`          |

**How it works internally:**

1. The raw CSV string is passed to `schema["~standard"].validate(rawValue)`
2. If the result has no `issues` → the output `value` becomes the cell's parsed value
3. If the result has `issues` → each issue's `message` is rendered as a cell-level error

This provides a single declaration that handles both coercion (`string → number`) and validation (`min(0)`) in one step.

```ts
// Standard Schema: coercion + validation in one declaration
{
  key: "amount",
  schema: z.coerce.number().min(0).max(1_000_000),
}
```

## Validation

### Two-Layer Validation Model

The CSV Importer uses a two-layer validation model. Both layers are optional and can be used independently or together.

| Layer           | Mechanism                            | Timing                                                               | Use case                                                        |
| --------------- | ------------------------------------ | -------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Client-side** | `CsvColumn.schema` (Standard Schema) | Synchronous. Runs on Review entry and immediately on each cell edit. | Coercion, format checks, required fields, range, pattern, enum. |
| **Server-side** | `onValidate`                         | Async. Runs on Review entry and on Import button press.              | Uniqueness, FK resolution, upsert detection, business rules.    |

Both layers produce errors in the same shape (`CellError`), which are merged and rendered uniformly in the Review table.

### `CellError`

Returned by `onValidate`. Same shape used internally by client-side rules.

```ts
type CellError = {
  /** 0-based row index in the parsed data. */
  rowIndex: number;
  /** The schema column key this error applies to. */
  columnKey: string;
  /** "error" blocks import; "warning" allows import. */
  level: "error" | "warning";
  /** Human-readable message displayed in the cell tooltip. */
  message: string;
};
```

### `ParsedRow`

The row data passed to `onValidate`, after transforms have been applied.

```ts
type ParsedRow = {
  /** 0-based row index, stable across edits. */
  rowIndex: number;
  /** Column key → transformed value. Only mapped columns are included. */
  data: Record<string, unknown>;
};
```

### `csv` — Built-in Schema Helpers

Zero-dependency helpers for common CSV column types. Each returns a `StandardSchemaV1`-compatible object, so they work in the same `schema` field as zod or valibot schemas. Designed for CSV-specific concerns (type coercion from raw strings, format variations).

```ts
import { csv } from "@tailor-platform/app-shell";
```

#### `csv.string(options?)`

Pass-through with optional length constraints. `min: 1` serves as a required check.

```ts
csv.string(); // any string
csv.string({ min: 1 }); // required (non-empty)
csv.string({ max: 100 }); // max length
csv.string({ min: 1, max: 50 });
```

```ts
csv.string(options?: {
  min?: number;   // minimum character length
  max?: number;   // maximum character length
}) => StandardSchemaV1<string, string>
```

#### `csv.number(options?)`

Coerces the raw CSV string to a number. Rejects `NaN`.

```ts
csv.number(); // any number
csv.number({ min: 0 }); // non-negative
csv.number({ min: 0, max: 999999 }); // range
csv.number({ integer: true }); // integers only
```

```ts
csv.number(options?: {
  min?: number;       // minimum value (inclusive)
  max?: number;       // maximum value (inclusive)
  integer?: boolean;  // reject non-integer values
}) => StandardSchemaV1<string, number>
```

#### `csv.boolean(options?)`

Coerces common CSV boolean representations to `true`/`false`. Case-insensitive.

Default truthy: `"true"`, `"1"`, `"yes"`
Default falsy: `"false"`, `"0"`, `"no"`

```ts
csv.boolean();
csv.boolean({ truthy: ["true", "1", "○"], falsy: ["false", "0", "×"] });
```

```ts
csv.boolean(options?: {
  truthy?: string[];  // values treated as true  (default: ["true", "1", "yes"])
  falsy?: string[];   // values treated as false (default: ["false", "0", "no"])
}) => StandardSchemaV1<string, boolean>
```

#### `csv.date()`

Coerces the raw CSV string to a `Date` object. Rejects unparseable values.

```ts
csv.date();
```

```ts
csv.date() => StandardSchemaV1<string, Date>
```

#### `csv.enum(values)`

Validates the value is one of the allowed strings. Case-sensitive.

```ts
csv.enum(["active", "inactive", "pending"]);
csv.enum(["JPY", "USD", "EUR"]);
```

```ts
csv.enum<T extends string>(values: T[]) => StandardSchemaV1<string, T>
```

#### Mixing built-in helpers with external libraries

All `csv.*` helpers implement `StandardSchemaV1`, so they can be freely mixed with zod, valibot, or any other Standard Schema-compatible library in the same schema definition:

```ts
import { csv } from "@tailor-platform/app-shell";
import { z } from "zod";

const schema = {
  columns: [
    { key: "name", label: "Name", schema: csv.string({ min: 1 }) }, // built-in
    { key: "email", label: "Email", schema: z.string().email() }, // zod
    { key: "amount", label: "Amount", schema: csv.number({ min: 0 }) }, // built-in
    { key: "status", label: "Status", schema: csv.enum(["active", "closed"]) }, // built-in
  ],
} satisfies CsvSchema;
```

## Import Event

### `CsvImportEvent`

Payload passed to `onImport` after all validation passes (no remaining errors).

```ts
type CsvImportEvent = {
  /** The original file selected by the user. */
  file: File;

  /** The confirmed column mappings. */
  mappings: CsvColumnMapping[];

  /** All corrections made by the user in the Review step. */
  corrections: CsvCorrection[];

  /** Remaining issues (warnings only — errors are resolved before import). */
  issues: CsvCellIssue[];

  /** Summary statistics. */
  summary: {
    totalRows: number;
    validRows: number;
    correctedRows: number;
    skippedRows: number;
    warningRows: number;
  };
};
```

### `CsvColumnMapping`

```ts
type CsvColumnMapping = {
  /** The header name from the CSV file. */
  csvHeader: string;
  /** The schema column key this maps to, or null if skipped. */
  columnKey: string | null;
};
```

### `CsvCorrection`

```ts
type CsvCorrection = {
  /** 0-based row index. */
  row: number;
  /** The schema column key. */
  columnKey: string;
  /** Value before the user's edit. */
  oldValue: unknown;
  /** Value after the user's edit. */
  newValue: unknown;
};
```

### `CsvCellIssue`

```ts
type CsvCellIssue = {
  /** 0-based row index. */
  row: number;
  /** The schema column key. */
  columnKey: string;
  /** The cell value that caused the issue. */
  value: unknown;
  /** Human-readable message. */
  message: string;
  /** "error" blocks import; "warning" allows import but is displayed. */
  severity: "error" | "warning";
};
```

## Utilities

### `buildRows`

Reconstructs fully-processed row data from the import event. Use this when you want to process data client-side rather than sending the raw file + metadata to a backend.

```ts
async function buildRows(
  event: CsvImportEvent,
  schema: CsvSchema,
): Promise<Record<string, unknown>[]>;
```

**When to use:**

```tsx
onImport: async (event) => {
  // Option A: Client-side processing
  const rows = await buildRows(event, schema);
  await fetch("/api/import", { method: "POST", body: JSON.stringify(rows) });

  // Option B: Send raw file + metadata to backend
  const formData = new FormData();
  formData.append("file", event.file);
  formData.append("mappings", JSON.stringify(event.mappings));
  formData.append("corrections", JSON.stringify(event.corrections));
  await fetch("/api/import", { method: "POST", body: formData });
};
```

## Labels

All user-facing text is customizable via the `labels` option. Only override the keys you need — defaults are used for the rest.

### `CsvImporterLabels`

```ts
type CsvImporterLabels = {
  // Upload step
  uploadTitle: string; // "Upload CSV"
  uploadDescription: string; // "Select a CSV file to import"
  uploadButton: string; // "Choose file"
  templateDownload: string; // "Download template"
  fileSizeError: string; // "File size exceeds the maximum allowed size"
  parseError: string; // "Failed to parse the CSV file"

  // Mapping step
  mappingTitle: string; // "Map columns"
  mappingDescription: string; // "Match CSV columns to the expected fields"
  mappingExpectedField: string; // "Expected field"
  mappingCsvColumn: string; // "CSV column"
  mappingPreview: string; // "Preview"

  // Review step
  reviewTitle: string; // "Review data"
  reviewDescription: string; // "Review and fix any issues before importing"
  reviewValidating: string; // "Validating..."

  // Complete step
  completeTitle: string; // "Import complete"
  completeDescription: string; // "Your data has been imported successfully"

  // Navigation
  nextButton: string; // "Next"
  backButton: string; // "Back"
  importButton: string; // "Import"
  closeButton: string; // "Close"
};
```

## Validation Flow (Detailed)

```
[Mapping] → user clicks [Next →]
    │
    ▼
[Review] enters loading state
    ├─ 1. Client-side: run schema["~standard"].validate() per cell (synchronous)
    ├─ 2. If onValidate is provided:
    │     └─ call onValidate(rows) (async, loading indicator shown)
    └─ 3. Merge client + server errors → render Review table
           │
           ▼
    User edits cells in the Review table
    └─ schema validation re-evaluated immediately per edit (synchronous)
    └─ onValidate is NOT re-invoked per edit
           │
           ▼
    User clicks [Import →]
    ├─ If onValidate is provided:
    │     ├─ Re-run onValidate(rows) with current data
    │     ├─ Errors found → update table, stay on Review
    │     └─ No errors → proceed
    └─ Execute onImport(event)
           │
           ▼
    [Complete]
```

## Usage Patterns

### Minimal (Client-Side Only)

```tsx
import { csv } from "@tailor-platform/app-shell";

const csvImporter = useCsvImporter({
  schema: {
    columns: [
      { key: "name", label: "Name", required: true, schema: csv.string({ min: 1 }) },
      { key: "quantity", label: "Quantity", schema: csv.number({ min: 0 }) },
      { key: "active", label: "Active", schema: csv.boolean() },
    ],
  },
  onImport: async (event) => {
    const rows = await buildRows(event, schema);
    console.log(rows);
  },
});
```

### Server Validation Only (No Client-Side Schema)

```tsx
const csvImporter = useCsvImporter({
  schema: {
    columns: [
      { key: "sku", label: "SKU", required: true },
      { key: "supplier", label: "Supplier", required: true },
      { key: "price", label: "Price" },
    ],
  },
  onValidate: async (rows) => {
    // Server checks coercion, uniqueness, FK resolution, business rules — all in one call
    const res = await fetch("/api/products/validate-import", {
      method: "POST",
      body: JSON.stringify(rows),
    });
    return res.json();
  },
  onImport: async (event) => {
    const rows = await buildRows(event, schema);
    await fetch("/api/products/import", { method: "POST", body: JSON.stringify(rows) });
  },
});
```

### Both Layers (Recommended for ERP)

```tsx
import { csv } from "@tailor-platform/app-shell";

const csvImporter = useCsvImporter({
  schema: {
    columns: [
      {
        key: "sku",
        label: "SKU",
        required: true,
        schema: csv.string({ min: 1 }),
        // ↑ instant format feedback via built-in helper
      },
      {
        key: "supplierId",
        label: "Supplier",
        required: true,
        aliases: ["仕入先", "vendor", "supplier_name"],
        // ↑ no client-side schema — FK validation handled by onValidate
      },
      {
        key: "unitPrice",
        label: "Unit Price",
        schema: csv.number({ min: 0, max: 999999 }),
      },
      {
        key: "status",
        label: "Status",
        schema: csv.enum(["draft", "confirmed", "shipped"]),
      },
    ],
  },
  onValidate: async (rows) => {
    const res = await fetch("/api/products/validate-import", {
      method: "POST",
      body: JSON.stringify(rows),
    });
    return res.json();
    // e.g. [
    //   { rowIndex: 2, columnKey: "sku", level: "error", message: "SKU already exists" },
    //   { rowIndex: 5, columnKey: "supplierId", level: "error", message: "Supplier not found" },
    // ]
  },
  onImport: async (event) => {
    const rows = await buildRows(event, schema);
    await fetch("/api/products/import", { method: "POST", body: JSON.stringify(rows) });
  },
});
```

### With Zod

```tsx
import { z } from "zod";

const csvImporter = useCsvImporter({
  schema: {
    columns: [
      { key: "sku", label: "SKU", required: true, schema: z.string().regex(/^[A-Z]{2}-\d{4}$/) },
      { key: "email", label: "Contact", schema: z.string().email() },
      { key: "price", label: "Price", schema: z.coerce.number().min(0) },
    ],
  },
  onImport: async (event) => {
    /* ... */
  },
});
```

### With Valibot

```tsx
import * as v from "valibot";

const csvImporter = useCsvImporter({
  schema: {
    columns: [
      { key: "name", label: "Name", required: true, schema: v.pipe(v.string(), v.minLength(1)) },
      { key: "email", label: "Email", schema: v.pipe(v.string(), v.email()) },
      {
        key: "age",
        label: "Age",
        schema: v.pipe(v.unknown(), v.transform(Number), v.number(), v.minValue(0)),
      },
    ],
  },
  onImport: async (event) => {
    /* ... */
  },
});
```

### Japanese ERP with Encoding Detection

```tsx
import { csv } from "@tailor-platform/app-shell";

const csvImporter = useCsvImporter({
  schema: {
    columns: [
      {
        key: "productName",
        label: "商品名",
        required: true,
        aliases: ["品名", "product"],
        schema: csv.string({ min: 1 }),
      },
      { key: "quantity", label: "数量", schema: csv.number({ integer: true, min: 0 }) },
      {
        key: "taxIncluded",
        label: "税込",
        schema: csv.boolean({ truthy: ["true", "1", "○"], falsy: ["false", "0", "×"] }),
      },
    ],
  },
  labels: {
    uploadTitle: "CSVアップロード",
    uploadButton: "ファイルを選択",
    importButton: "インポート",
  },
  onImport: async (event) => {
    /* ... */
  },
});
// Encoding detection (Shift-JIS, EUC-JP) is automatic — no configuration needed.
```
