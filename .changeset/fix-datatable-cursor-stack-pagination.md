---
"@tailor-platform/app-shell": patch
---

Fix cursor-based pagination in `DataTable`.

- Fix "Previous" button not working correctly when the GraphQL server returns unreliable `hasPreviousPage` (common with `first + after` queries per the Relay spec)
- Fix navigating back after jumping to the last page incorrectly returning to page 1
- Fix "Next" button remaining enabled past the last page when `total` is known
