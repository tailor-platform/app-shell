---
"@tailor-platform/app-shell": patch
---

Stop documenting the `astw:` prefix as an application customization API. It is an internal prefix for AppShell's precompiled CSS, so consumer-authored utilities may be absent from the shipped stylesheet and couple applications to component internals.

Use ordinary Tailwind utilities on application markup and documented layout hooks instead. For example, use `containerClassName="px-6"` on `Table.Root` and `gap={6}` on `Layout`; use component props, variants, or composition for appearance changes.
