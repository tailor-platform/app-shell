---
"@tailor-platform/app-shell": minor
---

Bundle Noto Sans JP so `font-medium` is a real weight in Japanese text.

Inter carries no CJK glyphs, so Japanese fell through to the system font. On Windows that is Yu Gothic UI, which ships only Light/Semilight/Regular/Semibold/Bold — no 500 — so CSS weight matching resolved `font-weight: 500` down to Regular and `font-medium`, the weight behind most labels, table cells and card titles, was indistinguishable from body copy. Current macOS was unaffected, since it ships Hiragino Sans W5. Bundling a variable font makes the weight scale hold on every platform instead of depending on what the OS installs.

`@tailor-platform/app-shell/styles` now ships Noto Sans JP Variable (continuous 100–900 axis) alongside Inter, metric-harmonised against it so mixed Japanese/Latin strings read at one optical size and a line containing Japanese is exactly as tall as one without. No import change is needed.

**This changes how Japanese text renders.** Japanese previously drew from the OS font (Hiragino Sans on macOS, Yu Gothic UI on Windows) and now draws from Noto Sans JP. Japanese runs measure about 6% narrower, which can relieve truncation and wrapping but not cause it; Latin is unaffected. Layouts pinned to the old Japanese metrics may need a look.

It also adds roughly 4.8 MB of woff2 subsets to your build output even if your app renders no Japanese, and takes the stylesheet from about 98 KB to 200 KB uncompressed (15 KB to 45 KB gzipped). The faces are restricted to Japanese codepoint blocks, so users download only the subsets their content touches — nothing at all for an app with no Japanese, ~910 KB for a typical first Japanese screen — and weight costs nothing extra, since every weight shares one file.

To opt out, or to use a brand font, set the new `--app-shell-font-sans` on `:root` after importing the styles:

```css
@import "@tailor-platform/app-shell/styles";

:root {
  --app-shell-font-sans: "Your Brand Sans", ui-sans-serif, system-ui, sans-serif;
}
```

Naming no Japanese family opts out of the download entirely, since each face carries a `unicode-range`. A replacement should be a variable font, or otherwise supply real 400/500/600/700 faces — the weight scale assumes all four exist.

See [Typography and Fonts](https://github.com/tailor-platform/app-shell/blob/main/docs/concepts/styling-theming.md#typography-and-fonts).
