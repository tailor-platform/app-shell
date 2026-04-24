---
"@tailor-platform/app-shell": patch
---

Fix `DataTable.Pagination` cursor-based pagination.

- Use a client-side `cursorStack` instead of relying on `hasPreviousPage`, which GraphQL servers may always return as `false` when using `first + after`.
- Fix navigating back after `goToLastPage` incorrectly returning to page 1.
- Fix Next button being enabled past the last page when `total` is known.

`CollectionControl` has a new required field `cursorStack: string[]`. If you are constructing a mock `CollectionControl` in tests, add `cursorStack: []`.

`CollectionControl.prevPage` now accepts an optional `cursor?: string` argument (was required). Existing call sites that pass a cursor continue to work unchanged.
