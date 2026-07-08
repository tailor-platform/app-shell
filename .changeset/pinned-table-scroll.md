---
"@tailor-platform/app-shell": minor
---

DataTable now scrolls internally: add `fill` prop to `Layout` to pin page chrome and scroll only the table rows.

```tsx
<Layout fill>
  <Layout.Header title="Products" />
  <Layout.Column>
    <DataTable.Root value={table}>
      <DataTable.Toolbar>…</DataTable.Toolbar>
      <DataTable.Table />
      <DataTable.Footer>
        <DataTable.Pagination />
      </DataTable.Footer>
    </DataTable.Root>
  </Layout.Column>
</Layout>
```

With `fill`, the page title, table toolbar, column header row (sticky), and footer stay visible at all heights — only the rows region scrolls vertically. Without `fill`, pages grow and scroll as before. Tables short enough to fit render without a scrollbar or layout shift.

**Behavior change:** the AppShell layout is now viewport-bounded (`h-svh` instead of `min-h-svh`), so page content scrolls inside the content area rather than on the document. Code relying on `window`/document scroll position should target the content area instead.

Also fixes the empty/error state reserving `pageSize`-worth of height — it is now capped at 5 rows, so large page sizes no longer produce a huge blank region below "No data".
