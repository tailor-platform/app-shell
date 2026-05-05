---
"@tailor-platform/app-shell": minor
---

LineItems: polish pass for the spreadsheet experience.

- New `renderInlineAddRow` slot renders an always-visible empty row directly below the scrollable table. Hosts can drop a `Combobox` (or any control) into it to add lines via type-ahead search.
- New `enableFullscreenToggle` prop (default `true`) shows a small expand icon in the top-right corner of the table; clicking it (or pressing `Esc` again) toggles a viewport-filling fullscreen overlay with a dark backdrop. Component state is preserved across the toggle.
- Spreadsheet selection visuals now use the brand `--primary` color: the active cell ring, the fill drag handle, the per-cell ring on every shift-selected cell, and the per-cell ring on every cell of an active fill-drag preview (matching the active cell's border).
- Native up/down spinner buttons are hidden globally on every `<Input type="number">` for a cleaner numeric editing experience.
- The "scroll active cell into view" effect now runs only when the focused coordinate actually changes, fixing a regression where typing in cells (and in the inline-add-row Combobox) could drop focus mid-keystroke. Smooth-scroll animation on cell focus has been removed for the same reason.
- The inline add-row sits as a sibling below the scroll container instead of inside `<tbody>`, so it remains anchored even when the table is virtualized and scrolled. `maxBodyHeight` JSDoc clarifies that the table grows up to this height before scrolling and that the add-row sits below the scroll area.
- BREAKING: `pageSize` and `showDirtyOffPageBanner` props are removed. Line items now always render as a single virtualized list — large lists load on scroll automatically, no pagination UI is rendered. Hosts that were paginating client-side should drop both props; the virtualizer handles thousands of rows efficiently.
