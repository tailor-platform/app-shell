---
"@tailor-platform/app-shell": patch
---

Fix `@tailor-platform/app-shell/styles` so consumer Tailwind utilities like `bg-card`, `border-border`, and `text-muted-foreground` resolve again without requiring `theme.css`.

`theme.css` remains a no-op compatibility shim, while `styles` now restores the Tailwind theme bridge and keeps the precompiled AppShell component CSS importable from a single entrypoint.
