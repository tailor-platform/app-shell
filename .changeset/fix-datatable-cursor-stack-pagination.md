---
"@tailor-platform/app-shell": major
---

Fix `DataTable.Pagination` to use a client-side cursor stack for backward navigation instead of relying on `hasPreviousPage`, which GraphQL servers may always return as `false` when using `first + after`.

**Breaking changes:**

`CollectionControl.prevPage` no longer accepts a cursor argument for standard back navigation. Instead, `cursorStack` (a new required field on `CollectionControl`) is managed internally by `useCollectionVariables`.

If you are calling `control.prevPage(cursor)` manually, update to `control.prevPage()` for forward-stack navigation, or `control.prevPage(startCursor)` to go back from `goToLastPage`.

`CollectionControl` now requires a `cursorStack: string[]` field. If you are constructing a mock `CollectionControl` in tests, add `cursorStack: []`.

**Bug fixes:**

- Navigating back after `goToLastPage` now correctly uses `last + before` with `startCursor` instead of incorrectly popping the empty cursor stack and returning to page 1.
- The Next button is now disabled when `currentPage >= totalPages` (when `total` is known), preventing an extra request for a non-existent page beyond the last one.
