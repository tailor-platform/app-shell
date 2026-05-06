---
"@tailor-platform/app-shell": minor
---

LineItems: new `rowActions?: (line: T) => ReactNode` prop on `LineItems.Table`.

Renders a trailing per-row actions column (delete, view, attach, etc.) auto-pinned to the right edge so the buttons stay visible during horizontal scroll. The actions cell is **not** part of the spreadsheet selection grid — no fill, no copy/paste, no drag-select.

```tsx
<LineItems.Table
  rowActions={(line) => (
    <>
      <Button variant="ghost" size="icon" onClick={() => onView(line)}>↗</Button>
      <Button variant="ghost" size="icon" onClick={() => hook.removeLine(line.lineRef)}>×</Button>
    </>
  )}
  rowActionsWidth={84}
/>
```

Demo: `/custom-page/stock-transfer-demo` shows the trailing actions column with a "view history" + "remove" pair.
