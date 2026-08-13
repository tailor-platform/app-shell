---
"@tailor-platform/app-shell": patch
---

Document how to remove the `@theme` bridge workaround, which silently breaks dark mode on 1.7+.

Apps that pasted the `@theme inline` block, `@custom-variant dark (&:is(.dark *))`, and a copy of the palette into their entry CSS (the workaround while `styles` shipped without the bridge, 1.5.0–1.6.1) keep those definitions winning over AppShell's own palette, because the default palette is imported inside `layer(theme.defaults)` and consumer CSS is unlayered. The build succeeds with no warning, but surfaces added since the copy render light-mode colours in dark mode.

Adds `docs/migrations.md`, a curated list of breaking changes and the steps each one requires, newest first — separate from the changelog so upgraders and AI agents have one narrow place to look. The first entry covers detecting and removing this workaround, including the requirement to be on 1.7.0 or later first, since the workaround is load-bearing before that.

`docs/concepts/styling-theming.md` and the bundled `app-shell-patterns` skill now document `:root` / `:root.dark` as the override form to use. A bare `.dark` override silently loses against the branded palettes (`cream`, `bloom`), which are imported unlayered and define their dark values on `:root.dark`.
