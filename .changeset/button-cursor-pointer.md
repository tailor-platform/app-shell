---
"@tailor-platform/app-shell": patch
---

Restore pointer cursor on `Button`. Tailwind v4 dropped the Preflight rule that
gave `button`/`[role="button"]` a `cursor: pointer`, so the base `Button` showed
the default arrow cursor while components that hardcode `astw:cursor-pointer`
(e.g. `ActionPanel`) did not. Added `astw:cursor-pointer` to the `buttonVariants`
base classes so all `Button` instances are consistent. Disabled buttons keep the
default cursor via the existing `astw:disabled:pointer-events-none`.
