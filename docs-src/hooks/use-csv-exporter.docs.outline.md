---
kind: code-backed
group: use-csv-exporter
title: useCsvExporter
description: Fetch all cursor-paginated rows and download them as a CSV file with progress and cancellation state
sources:
  - packages/core/src/components/csv-exporter/use-csv-exporter.ts
  - packages/core/src/components/csv-exporter/types.ts
---

# useCsvExporter

`useCsvExporter` fetches every cursor-paginated page of rows, creates a UTF-8 CSV, and returns props for the standalone [`CsvExporter`](../components/csv-exporter.md). It is client-agnostic: the calling application implements the `fetcher` with its own data client.

## Import

```tsx
import {
  CsvExporter,
  useCsvExporter,
  type CsvExportPage,
  type CsvExportColumn,
} from "@tailor-platform/app-shell";
```

## Usage

```tsx
const { open, props } = useCsvExporter({
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
    const connection = result.data?.products;
    if (!connection) return connection;
    return {
      rows: connection.edges.map(({ node }) => node),
      pageInfo: connection.pageInfo,
      total: connection.total,
    };
  },
});

<Button onClick={open}>Export products</Button>
<CsvExporter {...props} />;
```

The fetcher receives the cursor parameters for one page and returns a `CsvExportPage<TRow>` shaped as `{ rows, pageInfo, total? }`, using the same row representation as DataTable. `pageInfo` must include `hasNextPage` and `endCursor`; `total` is optional. For a GraphQL connection, extract the nodes into `rows` in the fetcher, as shown above. The hook follows `pageInfo.endCursor` until `hasNextPage` is false, then serializes and downloads every fetched row. It passes an `AbortSignal`; pass it to the client request when the client supports cancellation.

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
| `columns`         | `CsvExportColumn<TRow>[] \| Column<TRow>[]` | Required. Explicit CSV columns, or DataTable columns to derive them from.     |
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

A labelled DataTable column must provide `accessor` or `id`; otherwise TypeScript rejects it as a CSV column source. The exporter resolves values from `accessor(row)` first, then `row[id]`. Columns without a `label`, such as action columns, are excluded. Dates are exported as ISO strings and primitive arrays are joined with `, `. The supplied columns define the standalone schema; this hook does not read DataTable context or follow its visibility and ordering changes. Use explicit `CsvExportColumn[]` definitions for custom headers or value formatting. To export a table's current visible-column layout, use [`useDataTableCsvExporter`](./use-data-table-csv-exporter.md) with `DataTable.CSVExporter` instead; that component rejects standalone exporter props.

## Return value

| Property | Type                     | Description                                                                                 |
| -------- | ------------------------ | ------------------------------------------------------------------------------------------- |
| `open()` | `() => void`             | Opens the standard exporter UI.                                                             |
| `props`  | `CsvExporterProps<TRow>` | Spread directly onto `<CsvExporter {...props} />`. Not accepted by `DataTable.CSVExporter`. |

CSV cells are escaped using RFC 4180-compatible quoting, UTF-8 BOM is included for spreadsheet compatibility, and formula-like cell values are escaped before download.
