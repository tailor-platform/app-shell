---
"@tailor-platform/app-shell": minor
---

LineItems: skeleton loader for initial fetch + fast-scroll.

Two new opt-in behaviours on `LineItems.Table`:

- **`loading?: boolean`** + **`skeletonRowCount?: number`** (default 12) — when `loading` is true, the tbody renders shimmering placeholder rows in place of real data. All other table chrome (header, search, fullscreen toggle, floating dock) keeps rendering normally so the layout doesn't flash.

  ```tsx
  <LineItems.Table loading={isFetching} skeletonRowCount={14} />
  ```

- **Fast-scroll skeleton** (automatic, no opt-in) — during a fast scroll-flick, the visible cells visually swap to a pulse bar via a CSS attribute toggle on the scroll container; once scroll settles (~120ms idle), real cells reappear. The React tree doesn't change between transitions, so input focus survives a scroll-flick that returns to the editing cell.
