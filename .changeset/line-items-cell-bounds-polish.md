---
"@tailor-platform/app-shell": patch
---

LineItems: cell bounds and selection ring now align pixel-perfect with the cell box.

- The grid cell shell renders directly inside the `<td>` as `absolute inset-0` instead of being nested under an extra wrapper, so the cell box, the input, and the selection rectangle all share identical bounds.
- Active-cell and fill-preview selection borders are painted via an `inset` box-shadow on the cell shell rather than an absolute-positioned overlay, eliminating any size/rounding mismatch.
- Default virtualized row height bumped from 32px to 36px for slightly more breathing room around input text.
- Fill drag handle is now a smaller, flush 6×6px square seated on the cell's bottom-right corner.
