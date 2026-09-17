---
"@tailor-platform/app-shell": minor
---

Add `useCsvExporter` for client-side, cursor-paginated CSV downloads with progress and cancellation.

```tsx
const exporter = useCsvExporter({ defaultFilename: "products.csv", columns, fetcher });
<DataTable.CSVExporter exporter={exporter} />;
```

`DataTable.CSVExporter` provides a filename dialog and export progress UI.
