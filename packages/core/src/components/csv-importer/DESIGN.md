# CSV Importer — Design Document

## Overview

A Drawer-based CSV import component for ERP applications. Uses a `useCsvImporter` hook + `CsvImporter` component pattern with four steps: **Upload → Mapping → Review → Complete**.

## Use Cases

- **Initial data migration** — Import master data (products, contacts, suppliers) when onboarding to a new system
- **Bulk data update** — Update prices, inventory levels, or status fields across hundreds of records at once
- **External system integration** — Receive CSV files from partners or vendors and map their column format to internal schema
- **Periodic data sync** — Regular imports of transaction data (orders, invoices) from systems without API integration

## Step Flow

```
[1. Upload] → [2. Mapping] → [3. Review] → [4. Complete]
```

### Step 1: Upload

File selection via drag-and-drop or file picker. Validates file type and size before proceeding.

```
┌─────────────────────────────────────────────┐
│  Upload CSV                            [×]  │
│  ─────────────────────────────────────────  │
│  ● Upload  ○ Mapping  ○ Review  ○ Complete  │
│                                             │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ - - ─ ─ ┐  │
│  │                                       │  │
│  │             ↑  Choose file            │  │
│  │              CSV (max 10MB)           │  │
│  │                                       │  │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ - - ┘  │
│                                             │
│  ↓ Download template                        │
│                                             │
└─────────────────────────────────────────────┘
```

**Features:**

- **Drag-and-drop** — Drop zone with visual feedback.
- **File picker** — Click to open file dialog (accepts `.csv`).
- **Template download** — Link to download a CSV template with correct column headers derived from the schema. Reduces mapping errors by letting users start with the expected format. Generated client-side from `schema.columns` (using `key` or `label` as headers).
- **Auto-encoding detection** — Detects Shift-JIS, EUC-JP, etc. and converts to UTF-8. Critical for Japanese ERP environments.
- **File size validation** — Configurable max size (default 10MB).

### Step 2: Mapping

Schema-centric mapping UI. Each expected field shows a dropdown to select which CSV column maps to it.

```
┌─────────────────────────────────────────────┐
│  Upload CSV                            [×]  │
│  ─────────────────────────────────────────  │
│  ○ Upload  ● Mapping  ○ Review  ○ Complete  │
│                                             │
│       Expected field   CSV column  Preview  │
│  ┌──────────────────────────────────────┐   │
│  │ ✓  Order ID *     [order_id ▼] PO-001│   │
│  │ ✓  Supplier *     [vendor   ▼] Acme  │   │
│  │ !  Amount *       [— select ▼]  —    │   │
│  │ ○  Notes          [— select ▼]  —    │   │
│  └──────────────────────────────────────┘   │
│                                             │
│                          [Cancel] [Next →]  │
└─────────────────────────────────────────────┘
```

**Features:**

- **Schema-centric layout** — Rows are defined by schema columns, not CSV headers. Users see what the system expects and pick which CSV column fills each field.
- **Auto-matching** — CSV headers are automatically matched to schema columns by key, label, or aliases.
- **Required field indicators** — Red alert icon for unmapped required fields; blocks progression.
- **Preview values** — Shows the first row's value for the selected CSV column so users can verify the mapping is correct.

### Step 3: Review

Data validation table with inline editing for error correction.

```
┌─────────────────────────────────────────────┐
│  Upload CSV                            [×]  │
│  ─────────────────────────────────────────  │
│  ○ Upload  ○ Mapping  ● Review  ○ Complete  │
│                                             │
│  Total: 142 rows  Errors: 3  Warnings: 1    │
│  ┌──────────┬──────────┬──────────┐         │
│  │ Order ID │ Supplier │ Amount   │         │
│  ├──────────┼──────────┼──────────┤         │
│  │ PO-001   │ Acme Corp│ 52000    │         │
│  │ PO-002   │ [empty!] │ 18500    │         │
│  │ PO-003   │ Acme Corp│ [abc!]   │         │
│  └──────────┴──────────┴──────────┘         │
│                                             │
│                      [← Back] [Import →]    │
└─────────────────────────────────────────────┘
```

**Validation flow:**

```
Mapping → [Next →]
   │
   ▼
Review (loading)
   ├─ 1. Client-side: transform → rules (synchronous, immediate)
   ├─ 2. Server-side: onValidate(rows) (async, shows loading indicator)
   └─ 3. Merge all errors and display
          │
          ▼
     User edits cells
     (rules re-evaluated immediately on each edit)
          │
          ▼
     [Import →] clicked
          ├─ Re-run onValidate (shows loading indicator)
          ├─ Errors found → update Review table, do not proceed to import
          └─ No errors → execute onImport → move to Complete
```

- `rules` run client-side and synchronously, so feedback is reflected immediately on each cell edit (format checks, required checks, etc.).
- `onValidate` involves a server round-trip, so it only runs at two gate points: entering the Review step and pressing the Import button. It is not re-invoked on each edit.
- `rules` are optional. `onValidate` alone can cover all validation needs. `rules` are positioned as an optimization layer for instant feedback without hitting the server.

**Features:**

- **Cell-level validation** — Runs `transform` then `rules` per cell. Errors (red) block import; warnings (yellow) allow import.
- **Async backend validation (`onValidate`)** — Optional async hook that runs at two gate points: (1) entering the Review step, and (2) pressing the Import button. Validates rows against the server (uniqueness checks, foreign key resolution, upsert detection). Returns `CellError[]` in the same shape as client-side rule errors, which are merged into the review table. The component handles the plumbing (call validator, merge errors, let user fix and re-validate); the app provides the business logic (which fields are unique, which FKs to check). Without this hook, apps would either skip validation, pre-fetch entire lookup tables client-side (doesn't scale), or build custom post-import error screens — defeating the purpose of the inline error correction UX.

  ```ts
  onValidate?: (rows: ParsedRow[]) => Promise<CellError[]>

  // CellError uses the same shape client-side rules already produce:
  type CellError = {
    rowIndex: number
    columnKey: string
    level: "error" | "warning"
    message: string  // e.g. "SKU already exists", "Supplier not found"
  }
  ```

- **Import button as validation gate** — The Import button serves dual purpose: if `onValidate` returns errors, the review table is updated and import does not proceed; if no errors remain, `onImport` is executed and the flow moves to Complete.
- **Inline editing** — Users can fix errors directly in the review table without going back to the source file. Client-side `rules` are re-evaluated immediately on each edit; `onValidate` is re-invoked only when Import is pressed.
- **Correction tracking** — All user edits are tracked as `CsvCorrection` objects and passed to the `onImport` callback.
- **Summary bar** — Shows total rows, error count, and warning count.

### Step 4: Complete

```
┌─────────────────────────────────────────────┐
│  Upload CSV                            [×]  │
│  ─────────────────────────────────────────  │
│  ○ Upload  ○ Mapping  ○ Review  ● Complete  │
│                                             │
│        ✓ Import complete                    │
│                                             │
│        File: purchase-orders.csv            │
│        Rows imported: 142                   │
│        Rows corrected: 3                    │
│                                             │
│                                   [Close]   │
└─────────────────────────────────────────────┘
```

## Competitive Analysis

### Import UI Approaches in Existing Products

CSV import across ERP systems and SaaS products falls into three distinct patterns:

| Pattern | Products | Approach |
|---------|----------|----------|
| **Fixed-schema upload** | Shopify, Notion | Upload a CSV that matches a predefined column structure. No mapping UI — file must conform to the template. |
| **Column mapping UI** | Odoo, Dynamics 365, Flatfile, OneSchema | Upload any CSV, then map its columns to expected fields. Varying levels of validation and error correction. |
| **Batch job / data management** | SAP, NetSuite, Dynamics 365 (advanced) | Import as a backend job with staging tables, entity sequencing, and admin-level configuration. Not end-user-facing. |

### Per-Product Breakdown

| Product | Upload | Column mapping | Auto-match | Validation | Inline error fix | Transform | Encoding detection |
|---------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Shopify** | ✓ | ✗ Fixed template | — | ✗ Post-import email | ✗ | ✗ | ✗ |
| **Notion** | ✓ | ✗ Auto-detect | — | ✗ | ✗ | ✗ | ✗ |
| **Odoo** | ✓ | ✓ Column dropdown | ✓ Heuristic | ✓ Test button | ✗ Must fix source file | ✓ Server-side | ✗ |
| **Dynamics 365** | ✓ | ✓ Visual mapper | ✓ Name-based | ✓ Staging tables | △ Via staging | ✗ | ✓ Code page selection |
| **Flatfile** | ✓ | ✓ AI-assisted | ✓ AI | ✓ Real-time | ✓ | ✓ Hooks | ✓ |
| **This design** | ✓ + Template DL | ✓ Schema-centric | ✓ Key/label/alias | ✓ Cell-level + async backend | ✓ Inline editing | ✓ Client-side | ✓ Auto-detect |

### Why Fixed-Schema Products Skip Column Mapping

Shopify and Notion use a **"template-first"** approach: they provide a downloadable CSV template with predefined headers, and the import fails if the file deviates. This works because:

- **Controlled ecosystem** — These products own both the export and import sides. Users typically export from Shopify, edit in Excel, and re-import.
- **Simple data models** — Product or page data has a stable, well-known structure.
- **Lower error surface** — If the template matches, there's little room for mapping errors.

This approach breaks down in ERP scenarios where CSV files come from external systems with unpredictable column names and formats.

### How Odoo Handles Import

Odoo provides the most relevant comparison among traditional ERPs:

- **Upload → Mapping → Test → Import** flow (similar four-step structure).
- Column mapping uses a **dropdown per CSV column**, with Odoo auto-detecting field types from the first 10 rows.
- **"Test" button** validates the entire file before committing, showing errors in a list — but errors cannot be fixed inline. Users must edit the source CSV in Excel and re-upload.
- **Template download** — Odoo offers a "Download template" button so users can start with correct column names.
- **External ID round-trip** — The "I want to update data" mode ties import to prior exports via External IDs, enabling bulk updates.

Odoo's main gap: **no inline error correction**. When validation fails, users leave the import UI, fix the file externally, and start over. This is the single biggest friction point in ERP data import workflows.

### How Dynamics 365 Handles Import

Dynamics 365 uses a **Data Management workspace** with a more enterprise-grade approach:

- Import is defined as a **"job"** with entity selection, format configuration, and sequencing.
- **Visual mapping** between source columns and staging table columns, with auto-mapping by name.
- Data goes through **staging tables** where it can be verified before writing to target tables.
- Supports **parallel imports** for large datasets with configurable thread counts.
- More of an **admin/developer tool** than an end-user experience.

### Embedded Import SDKs (Flatfile, OneSchema, TableFlow)

A category of SaaS products has emerged specifically for embeddable CSV import:

- **Flatfile** — 5-step flow (Upload → AI Prepare → Map → Validate → Export). Uses AI for auto-cleaning and mapping. Provides a React SDK for embedding.
- **OneSchema** — Similar embedded importer with schema validation and column mapping.
- **TableFlow** — AI-powered extraction from any file format including PDFs and scanned documents.

These products validate the design pattern used in this component (schema-driven, multi-step, embeddable), but they are standalone SaaS services with their own pricing. AppShell provides this capability as a built-in framework component at no additional cost.

### What This Design Adds Beyond Competitors

1. **Inline error correction** — No surveyed ERP product (Odoo, Dynamics 365, SAP) allows users to fix validation errors directly in the review table. Users must always edit the source file and re-upload. This design eliminates that round-trip.
2. **Auto-encoding detection** — Automatic detection of Shift-JIS, EUC-JP, and other encodings is critical for Japanese ERP environments. Most products either require UTF-8 or offer manual code page selection (Dynamics 365).
3. **Client-side transforms with async backend validation** — The `transform` → `rules` pipeline runs entirely in the browser for immediate cell-level feedback. Additionally, the optional `onValidate` hook enables server round-trips during the Review step for database-level checks (uniqueness, foreign key resolution, upsert detection) — surfacing backend errors in the same inline UI before the final import. Odoo runs validation server-side but requires a full "Test" round-trip with no inline correction.
4. **Schema-centric mapping layout** — The mapping UI is organized by expected fields (what the system needs), not by CSV columns (what the file has). This makes it immediately clear which required fields are missing, rather than showing a long list of CSV headers that may or may not be relevant.
5. **Correction tracking** — User edits in the review step are tracked as `CsvCorrection` objects and passed to the `onImport` callback. This enables audit trails and backend-side re-validation if needed.
6. **Template download** — Like Odoo, this design offers a downloadable CSV template generated from the schema. Unlike Odoo (which requires server-side template generation per model), the template is generated client-side from `schema.columns`, making it zero-config for developers.

### Why This Design Uses a Drawer (Not a Full Page)

Most ERP import tools (Odoo, Dynamics 365) use a full-page experience. This design uses a Drawer because:

- **Contextual** — Users initiate import from a list view and stay in context. They can see the list they're importing into.
- **Consistency** — Mirrors the CsvExporter component which also uses a Drawer.
- **Lighter weight** — Importing a CSV is a task, not a workflow destination. A Drawer communicates "do this and return" rather than "navigate here to manage imports."

## ERP-Specific Considerations

1. **Multi-encoding support** — Japanese ERP environments commonly produce Shift-JIS or EUC-JP CSV files. Auto-detection with `encoding-japanese` avoids user confusion about encoding settings.
2. **Schema-driven validation** — `CsvColumn.rules` (required, pattern, range, oneOf, email, date, length) cover the most common ERP data validation needs without requiring custom logic.
3. **Transform pipeline** — `transform: (raw: string) => unknown` converts raw CSV strings into typed values (dates, numbers, booleans) before validation rules run. This separation enables clean error messages.
4. **Alias-based auto-matching** — `CsvColumn.aliases` handles the common ERP scenario where different systems export the same field under different names (e.g., "仕入先", "Vendor", "supplier_name" all map to the same field).
5. **`onImport` flexibility** — The callback receives the original `File`, `mappings`, `corrections`, and `issues`, allowing the consumer to either process data client-side (via `buildRows`) or send the raw file + metadata to a backend for server-side processing.
6. **Backend validation hook (`onValidate`)** — ERP imports almost always need validation against the database — uniqueness, foreign key resolution, upsert detection. The `onValidate` async hook runs during the Review step and returns errors in the same `CellError` shape as client-side rules, so server-returned errors are rendered with the same inline editing UX. This closes the gap where backend rejections only surface after `onImport`, breaking the inline error correction flow.
