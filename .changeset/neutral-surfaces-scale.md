---
"@tailor-platform/app-shell": minor
---

Add a `--backdrop` colour token and the `bg-backdrop` utility for the dim layer behind modals. `Dialog`, `Sheet` and the CsvImporter drawer use it instead of `bg-black/50`. The value is the same (black at 50%), so nothing changes on screen. Override `--backdrop` on `:root` to change every backdrop at once.

In the default palette, the surface and brand colours now read the internal gray scale and a white step, and the dark-mode lines read white alpha steps. All colours are unchanged. If your code reads these tokens with `getComputedStyle(...).getPropertyValue()`, the string changes notation, for example `#171717` instead of `rgba(23, 23, 23, 1)`, for `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--accent-foreground`, `--background`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--muted`, `--sidebar`, `--sidebar-foreground`, and light-mode `--sidebar-border`. `--foreground`, `--muted-foreground`, `--border` and `--input` already read the gray scale in 1.17.0, and the dark-mode lines keep the same `rgba(...)` string. The `cream` and `bloom` palettes are not changed.
