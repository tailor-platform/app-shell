---
"@tailor-platform/app-shell": minor
---

Bundle Noto Sans JP so `font-medium` is a real weight in Japanese text.

Inter carries no CJK glyphs, so Japanese fell through to the system font — and system Japanese fonts have no 500 weight (Yu Gothic UI on Windows ships only Light/Semilight/Regular/Semibold/Bold). CSS weight matching resolved `font-weight: 500` down to Regular, which made `font-medium` — the weight behind most labels, table cells and card titles — indistinguishable from body copy.

`@tailor-platform/app-shell/styles` now ships Noto Sans JP Variable (continuous 100–900 axis) alongside Inter, metric-harmonised against it so mixed Japanese/Latin strings read at one optical size and a line containing Japanese is exactly as tall as one without. No import change is needed.

**This changes how Japanese text renders.** Japanese previously drew from the OS font (Hiragino Sans on macOS, Yu Gothic UI on Windows) and now draws from Noto Sans JP. Japanese runs measure about 6% narrower, which can relieve truncation and wrapping but not cause it; Latin is unaffected. Layouts pinned to the old Japanese metrics may need a look.

It also adds roughly 5 MB of woff2 subsets to your build output even if your app renders no Japanese, and about 160 KB uncompressed (46 KB gzipped) to the stylesheet. Users download only the subsets their content touches — nothing at all for an app with no Japanese, ~910 KB for a typical first Japanese screen — and weight costs nothing extra, since every weight shares one file.

To opt out, or to use a brand font, set the new `--app-shell-font-sans` on `:root` after importing the styles:

```css
@import "@tailor-platform/app-shell/styles";

:root {
  --app-shell-font-sans: "Your Brand Sans", ui-sans-serif, system-ui, sans-serif;
}
```

Naming no Japanese family opts out of the download entirely, since each face carries a `unicode-range`. A replacement should be a variable font, or otherwise supply real 400/500/600/700 faces — the weight scale assumes all four exist.

See [Typography and Fonts](https://github.com/tailor-platform/app-shell/blob/main/docs/concepts/styling-theming.md#typography-and-fonts).
