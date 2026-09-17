---
title: useCsvExporter
description: Fetch all cursor-paginated rows and download them as a CSV file with progress and cancellation state
---

# useCsvExporter

`useCsvExporter` fetches every page from a Relay-style cursor connection, creates a UTF-8 CSV, and returns an exporter value for [`DataTable.CSVExport`](../components/data-table.md#csv-export). It is client-agnostic: the calling application implements the `fetcher` with its own data client.

## Import

```tsx
import {
  useCsvExporter,
  type CsvCursorConnection,
  type CsvExportColumn,
} from "@tailor-platform/app-shell";
```

## Usage

```tsx
const exporter = useCsvExporter({
  defaultFilename: "products.csv",
  columns,
  fetcher: async ({ first, after, signal }) => {
    const result = await client
      .query(
        ProductsCsvQuery,
        { first, after, order, query },
        {
          requestPolicy: "network-only",
          fetchOptions: { signal },
        },
      )
      .toPromise();

    if (result.error) throw result.error;
    return result.data?.products;
  },
});

<DataTable.CSVExport exporter={exporter} />;
```

The fetcher receives the cursor parameters for one page. The hook follows `pageInfo.endCursor` until `hasNextPage` is false, then serializes and downloads every fetched row. It passes an `AbortSignal`; pass it to the client request when the client supports cancellation.

Include `total` in the connection query to show a determinate progress bar:

```graphql
products(first: $first, after: $after, order: $order, query: $query) {
  total
  pageInfo {
    hasNextPage
    endCursor
  }
  edges {
    node {
      id
      name
    }
  }
}
```

Without `total`, the progress dialog shows the number of rows fetched but not a percentage.

## Options

| Option            | Type                                        | Description                                                                   |
| ----------------- | ------------------------------------------- | ----------------------------------------------------------------------------- |
| `defaultFilename` | `string`                                    | Initial file name shown in the dialog. A `.csv` suffix is added when omitted. |
| `columns`         | `CsvExportColumn<TRow>[] \| Column<TRow>[]` | Explicit CSV columns, or DataTable columns to derive them from.               |
| `fetcher`         | `CsvCursorFetcher<TRow>`                    | Fetches one cursor page. Required.                                            |
| `pageSize`        | `number`                                    | Rows requested per page. Defaults to `1000`.                                  |

## DataTable column derivation

Pass DataTable's `Column[]` directly when CSV headers and raw cell values should follow the table definition.

```tsx
const exporter = useCsvExporter({
  defaultFilename: "products.csv",
  columns,
  fetcher,
});
```

A labelled DataTable column must provide `accessor` or `id`; otherwise TypeScript rejects it as a CSV column source. The exporter resolves values from `accessor(row)` first, then `row[id]`. Columns without a `label`, such as action columns, are excluded. Dates are exported as ISO strings and primitive arrays are joined with `, `. Use explicit `CsvExportColumn[]` definitions when CSV values need a different format from the table.

## Return value

| Property               | Type                                                                                            | Description                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `defaultFilename`      | `string`                                                                                        | Suggested download name.                                                                             |
| `exportCsv(filename?)` | `(filename?: string) => Promise<boolean>`                                                       | Starts an export. Resolves `true` after completion and uses `defaultFilename` when no name is given. |
| `cancel()`             | `() => void`                                                                                    | Aborts the in-flight fetcher request.                                                                |
| `phase`                | `"idle" \| "fetching" \| "serializing" \| "downloading" \| "success" \| "error" \| "cancelled"` | Current export phase.                                                                                |
| `progress`             | `{ completed: number; total: number \| null }`                                                  | Fetched row count and optional total.                                                                |
| `error`                | `Error \| null`                                                                                 | Last export error.                                                                                   |

CSV cells are escaped using RFC 4180-compatible quoting, UTF-8 BOM is included for spreadsheet compatibility, and formula-like cell values are escaped before download.
