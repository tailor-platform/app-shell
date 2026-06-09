---
"@tailor-platform/app-shell": patch
---

Fix cursor consistency across `Button` and `Badge`:

- **`Button`**: restore the pointer cursor. Tailwind v4 dropped the Preflight
  rule that gave `button`/`[role="button"]` a `cursor: pointer`, so the base
  `Button` showed the default arrow cursor while components that hardcode
  `astw:cursor-pointer` (e.g. `ActionPanel`) did not. Added `astw:cursor-pointer`
  to the `buttonVariants` base classes so all `Button` instances are consistent.
  Disabled buttons keep the default cursor via the existing
  `astw:disabled:pointer-events-none`.
- **`Badge`**: pin `astw:cursor-default`. A `Badge` is non-interactive but
  renders a `<div>` with no cursor of its own, so it inherited `cursor: pointer`
  from clickable ancestors (e.g. a `DataTable` row with `onClickRow`). Explicitly
  setting the default cursor stops a badge from signalling clickability.
