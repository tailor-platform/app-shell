---
"@tailor-platform/app-shell": minor
---

LineItems: floating-bar UX is now a first-class library pattern.

Three new compound parts hosted at the bottom-center of the viewport when the hook reflects the relevant state. Hook-driven (auto-mount/unmount), composable, no boilerplate per page.

- **`LineItems.FloatingDock`** — fixed bottom-center container that hosts the bars and stacks them vertically. `pointer-events: none` outer / `auto` inner so the surrounding area stays click-through.
- **`LineItems.DirtyBar`** — auto-shows when `useLineItemsRoot().hook.isDirty`. Discard button defaults to `hook.revert()`; Save calls the consumer's `onSave`. Optional `warnOnNav` prop intercepts in-app anchor clicks + browser `beforeunload` so the user can't leave with unsaved changes; bar jiggles to draw attention.
- **`LineItems.SelectionBar<T>`** — render-prop bar that auto-shows when rows are selected. Library renders the dark pill chrome (count label + divider); consumer plugs in domain-specific actions (Delete, Export PDF, Update price, etc.) via render-prop receiving `{selectedIds, bulkUpdate, bulkRemove, clear}`.
- **`lineItemsFloatingBarStyles`** — exported style helpers (`primaryButton`, `secondaryButton`, `divider`, `label`) so consumers can build buttons inside the SelectionBar render-prop that visually match the DirtyBar's defaults.

```tsx
<LineItems.Root value={lineItems}>
  <LineItems.Table />
  <LineItems.FloatingDock>
    <LineItems.DirtyBar warnOnNav onSave={onSave} />
    <LineItems.SelectionBar>
      {({ bulkRemove, clear }) => (
        <>
          <button style={lineItemsFloatingBarStyles.primaryButton} onClick={bulkRemove}>Delete</button>
          <button style={lineItemsFloatingBarStyles.secondaryButton} onClick={clear}>Clear</button>
        </>
      )}
    </LineItems.SelectionBar>
  </LineItems.FloatingDock>
</LineItems.Root>
```

`LineItems.BulkActions` (the inline-toolbar variant) stays unchanged for apps that don't want the floating dock.
