---
title: CsvExporter
description: Filename dialog and progress UI for client-side cursor-paginated CSV downloads
---

# CsvExporter

`CsvExporter` is the standalone UI for [`useCsvExporter`](../api/use-csv-exporter.md). It provides a trigger button, editable filename dialog, fetch progress, and cancellation without requiring a DataTable.

## Import

```tsx
import { CsvExporter, useCsvExporter } from "@tailor-platform/app-shell";
```

## Usage

```tsx
const { open, props } = useCsvExporter({
  defaultFilename: "products.csv",
  columns: [
    { header: "Product code", value: (product) => product.code },
    { header: "Name", value: (product) => product.name },
  ],
  fetcher,
});

<Button onClick={open}>Download products</Button>
<CsvExporter {...props} />;
```

`useCsvExporter` owns the state. Its `open()` function opens the dialog, while `props` contains the controlled `open`, `onOpenChange`, and `exporter` values consumed by this component.

## Props

| Prop           | Type                      | Description                                            |
| -------------- | ------------------------- | ------------------------------------------------------ |
| `open`         | `boolean`                 | Whether the exporter dialog is open.                   |
| `onOpenChange` | `(open: boolean) => void` | Called when the dialog opens or closes.                |
| `exporter`     | `CsvExporterState`        | Export state and actions returned by `useCsvExporter`. |

The filename input is validated through AppShell `Form` and `Field`. While fetching, the dialog shows fetched rows and a determinate progress bar when the connection returns `total`. The user can cancel the request, or dismiss and reopen the dialog while the export continues.

## DataTable

For an export coupled to a table, use [`DataTable.CSVExporter`](./data-table.md#datatablecsvexporter) with the same props:

```tsx
<DataTable.CSVExporter {...props} />
```

When the hook is configured with DataTable columns, this variant exports only visible columns in their current user-defined order.
