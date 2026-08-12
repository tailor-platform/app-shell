---
"@tailor-platform/app-shell": patch
---

Document how to remove the 1.5.0 `@theme` bridge workaround, which silently breaks dark mode on 1.6+.

Apps that pasted the `@theme inline` block, `@custom-variant dark (&:is(.dark *))`, and a copy of the palette into their entry CSS (the recommended workaround while `styles` was missing the bridge) keep those definitions winning over AppShell's own palette, because AppShell imports it inside `layer(theme.defaults)` and consumer CSS is unlayered. The build succeeds with no warning, but surfaces added since the copy render light-mode colours in dark mode.

`docs/concepts/styling-theming.md` now covers how to detect and remove the workaround, and what token overrides should look like given the cascade layer. The bundled `app-shell-patterns` skill no longer tells apps to import the deprecated `@tailor-platform/app-shell/theme.css` shim, and documents dark mode as the `.dark` class rather than `[data-theme="dark"]`.
