---
"@tailor-platform/app-shell": patch
---

Fix `DataTable.Pagination` cursor-based pagination.

- Use a client-side `cursorStack` instead of relying on `hasPreviousPage`, which GraphQL servers may always return as `false` when using `first + after`.
- Fix navigating back after `goToLastPage` incorrectly returning to page 1.
- Fix Next button being enabled past the last page when `total` is known.

**Breaking:** `CollectionControl.nextPage` / `CollectionControl.prevPage` have been replaced with mode-aware `goToNextPage(pageInfo)` / `goToPrevPage(pageInfo)`. These encapsulate forward/backward logic so callers never branch on `paginationDirection`.

`CollectionControl` has new required fields: `cursorStack: string[]`, `goToNextPage`, `goToPrevPage`, `getHasPrevPage`, `getHasNextPage`. If you are constructing a mock `CollectionControl` in tests, add these fields.
