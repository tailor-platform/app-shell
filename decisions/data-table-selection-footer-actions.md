# Decision: DataTable bulk actions live in the footer, built into the component

> Status: **Decided — built into DataTable as `selectionActions` (Option A below). Implemented by PR #496.**
> Scope: where multi-select bulk actions render, and the `useDataTable` API that declares them. Ticket: tailor-inc/platform-planning#1738.

## Context

Multi-select already worked: `onSelectionChange` added the checkbox column, and the footer read "N of M row(s) selected". AppShell had no settled answer for **where the bulk actions go** once rows are selected. The `interaction/multi-select` pattern prescribed a floating bottom bar built on raw `Table.Root` with native checkboxes, which predated DataTable's own selection.

Sean suggested the **footer** instead, next to the count that already lives there. #496 started as a prototype of that plus an open question: build it into DataTable (A), or keep it a documented pattern composed from `useDataTableContext()` (B).

- **Placement:** the footer was agreed at the App-Shell board planning session on 2026-09-18. Its middle is empty in every table we ship, it never covers rows, and in `<Layout fill>` it is the only strip that stays on screen. The top toolbar is where apps compose search, filters, column settings and export (#559), and bulk actions would crowd it.
- **Component, not pattern:** Sean's review of the prototype (#pf-app-shell, 2026-09-04):
  - row selection is already a built-in concept, so this should be an opinionated treatment in core;
  - the consumer controls which actions appear;
  - add a pop-out while the footer is off-screen;
  - use a softer tone than the neutral bar, which glared in dark mode — maybe `accent`.

## Decision

**`selectionActions` on `useDataTable`, rendered by `DataTable.Footer`.**

The option mirrors `rowActions`: a declarative array on the hook that makes the component render a whole affordance. It is opt-in, and tables without it render exactly as before. A non-empty array also enables selection.

```tsx
const table = useDataTable({
  columns,
  data,
  control,
  selectionActions: [
    {
      id: "activate",
      label: "Activate",
      icon: <Play />,
      canApply: (v) => v.status === "inactive", // "Activate (6)", disabled at 0
      onClick: (rows) => activate(rows), // only the eligible rows; return the promise
    },
  ],
});
```

**What changed from the sketch the team first saw:**

- **`canApply(row)` replaces a consumer-supplied `count`.** Selection spans pages, and an app with server pagination can't count rows selected on other pages without keeping its own id→row cache. The table already sees every row the user selects, so it remembers them (`selectedRows`, each row as last loaded, with the current page's copy winning) and does the counting. It was first written `appliesTo`. Sean's review renamed it before it shipped, and moved it into `DataTableAction`, a base type both `RowAction` and `SelectionAction` extend, so one definition serves the row menu and the bar. `RowAction.isDisabled`, which reads the opposite way, is deprecated in its favour but still honoured.
- **`onClick(rows, { clearSelection })` replaces `onClick(ids)`.** Rows carry what an action needs. The helper clears the selection without the action reaching back to `table` from inside its own options object.
- **A returned promise is waited on.** While it is pending, every action is disabled, with a spinner on the running one, so a slow request can't be fired twice. When it resolves, the selection clears, unless the action sets `keepSelection`, as an export would. The rows it acted on may have changed, and copies remembered from other pages can't refresh themselves, so keeping them would hand stale rows to the next action. A rejection keeps the selection for a retry and logs a `[DataTable]` error. A synchronous `onClick`, typically one that opens a confirm dialog, leaves the selection alone.
- **The tone is `accent`, not primary or an inverted neutral.** It stays soft in all three themes and both modes, and matches the tint of selected rows. Primary is near-white in the default theme's dark mode, which brings back the glare Sean flagged.

**How the bar behaves:**

- **Layout:** built on the generic `Toolbar` (#559). The bar is a `Toolbar.Row` (role `toolbar`, Arrow/Home/End navigation) containing count · actions · Clear. Pagination stays alongside and hides its own count while the bar is up.
- **Overflow:** three actions render inline and the rest go into a "More actions" menu, as the old pattern already required.
- **Pop-out:** the footer is `position: sticky; bottom: 0` while the bar is open, so on a page-scrolling table it rides the bottom of the viewport and settles back at the table's end. For this, the DataTable root uses `overflow: clip`. #559 had introduced `overflow: hidden` to clip the toolbar to the rounded frame, and that made the root a scroll container, which pinned the sticky footer inside the table.
- **Accessibility:** a persistent polite live region announces the count from the first tick. When the bar closes with focus inside it, focus returns to the header checkbox.
- **Header checkbox:** it is page-scoped in both directions. It previously replaced the selection and cleared every page, which the bar's cross-page count made visible.

## Consequences

- **`interaction/multi-select` is rewritten** around `selectionActions`. The floating bar is retired: the sticky footer covers the "keep it on screen" need, and lists that want bulk actions should be DataTables.
- **#525 interaction:** if it lands controlled/default `rowSelection`, ids selected outside the UI have no remembered row until their page loads. `canApply` counts cover loaded rows only, and this is documented. Whichever of #525 and this lands second adapts the other: the row memory is written wherever selection is written.
- **Where the pop-out works:** it sticks to the nearest scrolling ancestor. Inside a scrolling drawer or panel it rides that container. Inside a wrapper with `overflow: hidden`, it stays in the footer. The docs say so. `overflow: clip` needs Safari 16+, and Sean asked for a check of `clip` together with `border-radius` there. If that misrenders, the fallback is `clip-path: inset(0 round …)`, which also clips without creating a scroll container.
- **Toasts vs. the bar:** bulk actions naturally end in a toast, and the default bottom-right toast sits over the footer's pagination for a few seconds. That is tolerable, but worth revisiting when toast placement is next touched.

## Not in this decision (follow-ups)

- Width-aware overflow, so actions move into "⋯" as space runs out rather than at a fixed three. This came from Sean's review. It belongs in the generic `Toolbar`, so every toolbar gets it, and each item then needs a way to describe its menu form. To do with Seiya.
- "Select all N" across pages (needs server-side semantics).
- A placeable `DataTable.SelectionActions` for custom placement, e.g. an in-toolbar variant. This follows the "option = default placement, sub-component = custom placement" rule from tailor-inc/platform-planning#1699; add it when a consumer needs it.
- A pending/loading state on an action, tooltips explaining a disabled action, and Escape to clear.
