---
"@tailor-platform/app-shell": minor
---

Rename the typography role variables from `--app-shell-type-<role>-<size|line-height|weight|letter-spacing>` to `--type-<role>-<size|line-height|weight|letter-spacing>`, to match the colour roles (`--danger-*`, ...) and `--semantic-shadow-*`.

The old names still work: each `text-*` utility reads the matching `--app-shell-type-*` first and falls back to `--type-*`, so an override such as `--app-shell-type-heading-md-size` keeps its effect, on `:root` or on any other element. The old names are deprecated and will be removed in the next major. Rename them in your CSS:

```css
:root {
  --type-heading-md-size: 1.25rem; /* was --app-shell-type-heading-md-size */
}
```

The `text-*` utilities (`text-heading-md`, ...) do not change.

AppShell no longer defines the `--app-shell-type-*` variables. Code that reads them with `getComputedStyle(...).getPropertyValue()` gets an empty string; read `--type-*` instead.
