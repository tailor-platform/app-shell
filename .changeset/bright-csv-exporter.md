---
"@tailor-platform/app-shell": minor
---

Add `useCsvExporter` and the standalone `CsvExporter` dialog for client-side, cursor-paginated CSV downloads with filename editing, progress, cancellation, UTF-8 BOM, and spreadsheet formula escaping. It is data-client and DataTable independent, so it can be opened from any button or collection UI. Fetchers return `CsvExportPage` values shaped as `{ rows, pageInfo, total? }`, using the same row representation as DataTable.

```tsx
const { open, props } = useCsvExporter({ defaultFilename: "products.csv", columns, fetcher });

<Button onClick={open}>Export CSV</Button>
<CsvExporter {...props} />;
```

Add `useDataTableCsvExporter` and `DataTable.CSVExporter` for table-integrated exports. The dedicated hook takes no column configuration and can be called outside `DataTable.Root`; the component accepts only its branded exporter props and supplies the enclosing table's visible columns in their current order when a download starts. Changing the table layout does not change an export already in progress, and hiding all exportable columns fails before fetching.

```tsx
const { props: tableExporter } = useDataTableCsvExporter({
  defaultFilename: "products.csv",
  fetcher,
});

<DataTable.Root value={table}>
  <DataTable.CSVExporter {...tableExporter} />
</DataTable.Root>;
```
