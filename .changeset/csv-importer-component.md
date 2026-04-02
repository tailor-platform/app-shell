---
"@tailor-platform/app-shell": minor
---

Add `CsvImporter` component — a guided, multi-step CSV import flow with drag-and-drop upload, interactive column mapping, Standard Schema validation, inline cell editing, and async server-side validation support.

Key features:

- **Drag & drop upload** with file size limit enforcement
- **Auto column matching** via aliases and fuzzy header detection
- **Standard Schema validation** with built-in `csv.string()`, `csv.number()`, `csv.boolean()`, `csv.date()`, and `csv.enum()` validators that handle coercion and validation in one step
- **Inline error correction** — users can fix validation errors directly in the review table before importing
- **Async `onValidate`** callback for server-side checks (e.g. uniqueness constraints)
- **Built-in i18n support** — English and Japanese labels included out of the box

```tsx
import {
  CsvImporter,
  useCsvImporter,
  csv,
  type CsvCellIssue,
} from "@tailor-platform/app-shell";

const { open, props } = useCsvImporter({
  schema: {
    // Each column defines a mapping target for CSV headers
    columns: [
      {
        // Becomes the object key in parsed row data
        key: "name",
        // Display label shown in the mapping UI
        label: "Name",
        // Must be mapped to a CSV header before proceeding
        required: true,
        // Alternative CSV header names for auto-matching
        aliases: ["product_name"],
        // Standard Schema validator — coerces and validates in one step
        schema: csv.string({ min: 1 }),
      },
      {
        key: "price",
        label: "Price",
        schema: csv.number({ min: 0 }), // Coerces the raw CSV string to a number and rejects NaN
      },
      {
        key: "active",
        label: "Active",
        schema: csv.boolean(), // Recognises "true"/"1"/"yes" and "false"/"0"/"no" (case-insensitive)
      },
    ],
  },

  // Async callback invoked after schema validation passes.
  // Use it for server-side checks such as uniqueness or foreign-key lookups.
  onValidate: async (rows) => {
    // Async API request that returns CsvCellIssue[] — shown inline in the review table
    return await validateOnServer(rows);
  },

  // Called when the user confirms the import after resolving all errors.
  // `event` contains the final rows, mappings, corrections, and summary stats.
  onImport: (event) => {
    console.log(event.summary);
    // => { totalRows, validRows, correctedRows, skippedRows, warningRows }
  },
});

// open() triggers the drawer; props wires up the multi-step UI
<Button onClick={open}>Import CSV</Button>
<CsvImporter {...props} />
```
