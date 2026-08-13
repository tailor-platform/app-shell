---
title: Migrations
description: Breaking changes and required migration steps for AppShell upgrades, newest first
---

# Migrations

Every change that requires you to edit your application before or after upgrading, newest first.

This page is deliberately narrow. It is **not** a changelog — see [`packages/core/CHANGELOG.md`](../packages/core/CHANGELOG.md) for the full release history including features and fixes. A change belongs here only if an app that does nothing will break, misbehave, or silently drift.

Each entry states which versions are affected, what breaks, how to detect it, and what to change. Entries stay here permanently; they are not pruned when they get old, because apps upgrade across arbitrary version gaps.

| Versions      | Change                                                                             |
| ------------- | ---------------------------------------------------------------------------------- |
| 1.5.0 → 1.7.0 | [Remove the theme bridge workaround](#150--170-remove-the-theme-bridge-workaround) |

## 1.5.0 → 1.7.0: remove the theme bridge workaround

**Applies to:** apps that pasted the `@theme inline` block, `@custom-variant dark`, and AppShell's palette into their entry CSS — the workaround for `styles` shipping without the Tailwind bridge.

**`styles` regained the bridge in 1.7.0.** On 1.5.0–1.6.1 the workaround is load-bearing, so upgrade to 1.7.0 or later _before_ deleting any of it. Remove it earlier and every AppShell-token utility — `bg-card`, `bg-background`, `text-muted-foreground`, `border-border` — stops resolving, while `dark:` variants fall back to Tailwind's `prefers-color-scheme` default and stop tracking the `.dark` class.

From 1.7.0 the workaround is not merely redundant. It actively breaks dark mode, and the build succeeds with no warning:

- Your pasted `:root` and `.dark` blocks are unlayered, so they beat AppShell's layered default palette. Colours freeze at the values you copied, and any surface AppShell has added since has no dark value at all — so it renders light colours in dark mode: white text on white cards, unreadable disabled inputs.
- `@custom-variant dark (&:is(.dark *))` overrides AppShell's `&:where(.dark, .dark *)`. The `:is(.dark *)` form matches only _descendants_ of `.dark`, so `dark:` utilities stop applying to the `.dark` element itself.

### Removing it

Delete from your entry CSS:

- the `@theme inline { … }` block,
- the `@custom-variant dark (…)` rule,
- every `:root` and `.dark` block copied from AppShell's palette — **all** of it, including the `*-foreground` pairs, `--status-*`, `--alert-*`, `--sidebar-*` and `--semantic-shadow-*`. The foregrounds are what leave text white on white, so a partial deletion reproduces the bug.
- any `@import "@tailor-platform/app-shell/theme.css"` (a no-op shim since 1.6.0, kept only so older apps keep building).

To find it, search every CSS file the app loads — not just the entry point, since `app/` and `styles/` are as common as `src/`:

```bash
grep -rnE "@theme inline|@custom-variant|app-shell/theme\.css|--(card|popover|muted|sidebar|destructive|accent)(-foreground)?:" --include="*.css" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.next .
```

Excluding `node_modules` matters: AppShell's own palette files declare these tokens too, and they must not be touched. In your own CSS, hits are either the workaround, which goes, or deliberate overrides, which should take the `:root` / `:root.dark` form described in [Overriding tokens](./concepts/styling-theming.md#overriding-tokens).

What remains is short — [`examples/vite-app/src/index.css`](https://github.com/tailor-platform/app-shell/blob/main/examples/vite-app/src/index.css) is a working reference for the shape (it also imports a branded palette, which is optional):

```css
@import "tailwindcss";
@import "@tailor-platform/app-shell/styles";

html,
body {
  margin: 0;
  padding: 0;
}
```

### Verifying

Toggle dark mode and confirm a real surface changes: inspect a `Card` and watch its computed `background-color` go from `rgb(255, 255, 255)` to `rgb(23, 23, 23)` on the default palette.

Reading the token directly also works — `getComputedStyle(document.documentElement).getPropertyValue("--card")` returns the winning declaration, so a stale copy shows up as its own value. Just compare against the authored notation: AppShell writes `rgba(23, 23, 23, 1)`, not `#171717`, and the computed value preserves that form.
