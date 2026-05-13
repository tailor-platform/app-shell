---
"@tailor-platform/app-shell": patch
---

Narrow `Column.accessor`'s return type per built-in `type` so the typed cell renderers reject values they can't display. Returning an array or a plain object from a `text` / `number` / `money` / `date` / `badge` / `link` accessor is now a compile error instead of silently rendering `[object Object]` or a stringified list. `null` and `undefined` are still allowed and continue to render the `—` placeholder. Columns without a `type` retain the loose `unknown` return type — they pair with `render` to draw whatever shape they like.

```tsx
column({
  label: "Tags",
  type: "text",
  // ^ compile error: text accessor cannot return an array.
  accessor: (row) => row.tags,
});
```
