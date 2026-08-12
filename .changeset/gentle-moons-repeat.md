---
"@tailor-platform/app-shell": patch
---

Document how to remove the `@theme` bridge workaround, which silently breaks dark mode on 1.7+.

Apps that pasted the `@theme inline` block, `@custom-variant dark (&:is(.dark *))`, and a copy of the palette into their entry CSS (the workaround while `styles` shipped without the bridge, 1.5.0–1.6.1) keep those definitions winning over AppShell's own palette, because the default palette is imported inside `layer(theme.defaults)` and consumer CSS is unlayered. The build succeeds with no warning, but surfaces added since the copy render light-mode colours in dark mode.

`docs/concepts/styling-theming.md` now covers how to detect and remove the workaround — including the requirement to be on 1.7.0 or later first, since the workaround is load-bearing before that — and documents `:root` / `:root.dark` as the override form that holds against both the layered default palette and the unlayered branded ones. The bundled `app-shell-patterns` skill no longer tells apps to import the deprecated `@tailor-platform/app-shell/theme.css` shim, and documents dark mode as the `.dark` class rather than `[data-theme="dark"]`.
