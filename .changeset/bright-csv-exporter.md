---
"@tailor-platform/app-shell": minor
---

Add `useCsvExporter` and the standalone `CsvExporter` dialog for client-side, cursor-paginated CSV downloads with filename editing, progress, cancellation, UTF-8 BOM, and spreadsheet formula escaping. It is data-client and DataTable independent, so it can be opened from any button or collection UI.

```tsx
const { open, props } = useCsvExporter({ defaultFilename: "products.csv", columns, fetcher });

<Button onClick={open}>Export CSV</Button>
<CsvExporter {...props} />;
```

Add `DataTable.CSVExporter`, which accepts the same props and, when the hook receives DataTable columns, exports the user's current visible columns in their selected order.

```tsx
<DataTable.CSVExporter {...props} />
```
