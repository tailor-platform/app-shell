---
title: CsvImporter
description: Guided multi-step CSV import flow with drag-and-drop upload, column mapping, validation, and inline error correction
---

# CsvImporter

The `CsvImporter` component provides a guided, multi-step CSV import flow rendered inside a drawer. It handles drag-and-drop file upload, interactive column mapping, Standard Schema validation, inline cell editing, and async server-side validation.

## Import

```tsx
import {
  CsvImporter,
  useCsvImporter,
  csv,
  type CsvSchema,
  type CsvColumn,
  type CsvImportEvent,
  type CsvCellIssue,
  type CsvCorrection,
  type CsvColumnMapping,
  type ParsedRow,
} from "@tailor-platform/app-shell"
```

## Basic Usage

Use the `useCsvImporter` hook to manage state, then render `<CsvImporter>` with the returned props.

```tsx
import { CsvImporter, useCsvImporter, csv } from "@tailor-platform/app-shell"
import { Button } from "@tailor-platform/app-shell"

function ProductImport() {
  const { open, props } = useCsvImporter({
    schema: {
      columns: [
        {
          key: "name",
          label: "Name",
          required: true,
          aliases: ["product_name"],
          schema: csv.string({ min: 1 }),
        },
        {
          key: "price",
          label: "Price",
          schema: csv.number({ min: 0 }),
        },
        {
          key: "active",
          label: "Active",
          schema: csv.boolean(),
        },
      ],
    },
    onImport: (event) => {
      console.log(event.summary)
    },
  })

  return (
    <>
      <Button onClick={open}>Import CSV</Button>
      <CsvImporter {...props} />
    </>
  )
}
```

## `useCsvImporter`

The `useCsvImporter` hook manages the open/close state and returns both an `open` function and `props` to spread onto `<CsvImporter>`.

### Options

| Option        | Type                                               | Default            | Description                                                                 |
| ------------- | -------------------------------------------------- | ------------------ | --------------------------------------------------------------------------- |
| `schema`      | `CsvSchema`                                        | —                  | Column definitions for the import (see [CsvSchema](#csvschema))             |
| `onImport`    | `(event: CsvImportEvent) => void \| Promise<void>` | —                  | Called when the user confirms the import after resolving all errors         |
| `onValidate`  | `(rows: ParsedRow[]) => Promise<CsvCellIssue[]>`   | —                  | Optional async callback for server-side validation after schema checks pass |
| `maxFileSize` | `number`                                           | `10485760` (10 MB) | Maximum allowed file size in bytes                                          |

### Return Value

| Property | Type               | Description                                           |
| -------- | ------------------ | ----------------------------------------------------- |
| `open`   | `() => void`       | Function to programmatically open the importer drawer |
| `props`  | `CsvImporterProps` | Props object to spread directly onto `<CsvImporter>`  |

## `CsvImporter` Props

`CsvImporter` is intended to be used with props returned from `useCsvImporter`. Spread the `props` object directly onto the component.

```tsx
<CsvImporter {...props} />
```

## Schemas

### `CsvSchema`

```ts
type CsvSchema = {
  columns: CsvColumn[]
}
```

### `CsvColumn`

| Property      | Type               | Default | Description                                                                             |
| ------------- | ------------------ | ------- | --------------------------------------------------------------------------------------- |
| `key`         | `string`           | —       | Internal key; becomes the object key in parsed row data                                 |
| `label`       | `string`           | —       | Display label shown in the mapping UI                                                   |
| `description` | `string`           | —       | Optional hint shown in the mapping UI                                                   |
| `required`    | `boolean`          | `false` | Whether this column must be mapped before proceeding                                    |
| `aliases`     | `string[]`         | —       | Alternative CSV header names for automatic matching                                     |
| `schema`      | `StandardSchemaV1` | —       | Standard Schema validator for coercion and validation (see [csv helpers](#csv-helpers)) |

## `csv` Helpers

Built-in Standard Schema validators for common CSV column types. Each helper handles both coercion and validation in a single declaration.

| Helper                                                                    | Output type        | Description                                                             |
| ------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------- |
| `csv.string(options?: { min?: number; max?: number })`                    | `string`           | Pass-through string with optional length constraints                    |
| `csv.number(options?: { min?: number; max?: number; integer?: boolean })` | `number`           | Coerces raw CSV string to a number; rejects `NaN`                       |
| `csv.boolean(options?: { truthy?: string[]; falsy?: string[] })`          | `boolean`          | Recognises `"true"/"1"/"yes"` and `"false"/"0"/"no"` (case-insensitive) |
| `csv.date()`                                                              | `Date`             | Coerces raw CSV string to a `Date`; rejects unparseable values          |
| `csv.enum(values: string[])`                                              | `T extends string` | Validates the value is one of the allowed strings (case-sensitive)      |

```tsx
// String with required check (min: 1)
csv.string({ min: 1 })

// Number with lower bound
csv.number({ min: 0 })

// Integer only
csv.number({ integer: true })

// Boolean with defaults: truthy = ["true","1","yes"], falsy = ["false","0","no"]
csv.boolean()

// Date
csv.date()

// Enum
csv.enum(["active", "inactive", "pending"])
```

## Server-side Validation

Use `onValidate` to perform async checks (e.g. uniqueness constraints) after schema validation passes. Return an array of `CsvCellIssue` objects to mark cells with errors or warnings.

```tsx
const { open, props } = useCsvImporter({
  schema: { columns: [...] },
  onValidate: async (rows) => {
    const issues = await checkUniqueness(rows);
    return issues; // CsvCellIssue[]
  },
  onImport: (event) => { /* ... */ },
});
```

### `CsvCellIssue`

| Property    | Type                   | Description                                          |
| ----------- | ---------------------- | ---------------------------------------------------- |
| `rowIndex`  | `number`               | 0-based row index                                    |
| `columnKey` | `string`               | The schema column key                                |
| `level`     | `"error" \| "warning"` | `"error"` blocks import; `"warning"` allows import   |
| `message`   | `string`               | Human-readable message displayed inline in the table |

## Import Event

The `onImport` callback receives a `CsvImportEvent` with the following shape:

| Property      | Type                                                                | Description                                                              |
| ------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `file`        | `File`                                                              | The original file selected by the user                                   |
| `mappings`    | `CsvColumnMapping[]`                                                | The confirmed column mappings                                            |
| `corrections` | `CsvCorrection[]`                                                   | Corrections made by the user in the review step                          |
| `issues`      | `CsvCellIssue[]`                                                    | Any remaining issues (warnings only — errors are resolved before import) |
| `summary`     | `{ totalRows, validRows, correctedRows, skippedRows, warningRows }` | Summary statistics                                                       |

## `buildRows`

A utility to reconstruct the fully processed row data on the client side from a `CsvImportEvent`. Useful when you want typed row objects on the frontend instead of sending raw file data to a server.

```tsx
import { buildRows } from "@tailor-platform/app-shell";

onImport: async (event) => {
  const rows = await buildRows(event, schema);
  // rows: Record<string, unknown>[] — schema coercion and corrections applied
  await saveToBackend(rows);
},
```

> If you are sending the file, mappings, and corrections to a backend for processing, you do not need `buildRows`.

## i18n

`CsvImporter` includes built-in English and Japanese labels. No additional setup is required.

## Related Components

- [Sheet](./sheet.md) — Slide-in panel (the drawer used internally by CsvImporter)
- [Button](./button.md) — Use as the trigger to open the importer
