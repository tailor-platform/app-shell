---
"@tailor-platform/app-shell": patch
---

LineItems: fullscreen open animation + shift-click text-selection fix + single-cell broadcast paste.

- Fullscreen modal now slides + fades in on open (backdrop fade 220ms, card translate-from-below 280ms with a soft cubic-bezier ease-out). Close is instant.
- Shift-click range selection no longer paints the browser's native text-selection across editable cells between the previous focus and the click point. Handler now blurs any focused editor, calls `removeAllRanges()`, and parks focus on the grid container.
- Paste a single copied cell into a multi-cell selection now broadcasts that value to every selected cell (Excel / Sheets parity), skipping read-only columns with the existing toast.
