---
"@tailor-platform/app-shell": minor
---

Bridge `--alert-*` tokens into Tailwind's theme as `--color-alert-*`

The `--alert-*` design tokens (`neutral` / `success` / `warning` / `error` / `info` × `background` / `foreground` / `foreground-muted` / `border`) are now exposed through `@theme inline`, matching how `--status-*` is already bridged.

Application code can now use ordinary color utilities for callouts, banners, and status-highlighted rows:

```tsx
// Before — arbitrary values, no autocomplete, silent failure on a typo
<div className="bg-[color:var(--alert-info-background)] text-[color:var(--alert-info-foreground)]" />

// After
<div className="bg-alert-info-background text-alert-info-foreground" />
```

This is purely additive — existing arbitrary-value usage keeps working, and the generated CSS is unchanged.
