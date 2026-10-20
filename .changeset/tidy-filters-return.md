---
"@tailor-platform/app-shell": patch
---

Return an empty object from `useCollectionVariables().variables.query` and `useURLCollectionVariables().variables.query` when no filters are active, so `Object.keys` and destructuring are safe without an `undefined` fallback. Align the public types and documentation with this contract; empty sort still returns `undefined`.

If you previously checked `variables.query` for truthiness to detect active filters, use `control.filters.length > 0` instead.
