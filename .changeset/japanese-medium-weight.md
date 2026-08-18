---
"@tailor-platform/app-shell": minor
---

Add an opt-in Japanese font bundle so `font-medium` is a real weight in Japanese text.

Inter carries no CJK glyphs, so Japanese fell through to the system font — and system Japanese fonts have no 500 weight (Yu Gothic UI on Windows ships only Light/Semilight/Regular/Semibold/Bold). CSS weight matching resolved `font-weight: 500` down to Regular, which made `font-medium` — the weight behind most labels, table cells and card titles — indistinguishable from body copy.

```css
@import "@tailor-platform/app-shell/styles";
@import "@tailor-platform/app-shell/fonts/noto-sans-jp";
```

The bundle ships Noto Sans JP Variable (continuous 100–900 axis) metric-harmonised against Inter, so mixed Japanese/Latin strings read at one optical size and a line containing Japanese is exactly as tall as one without.

It is opt-in because a bundler emits every `unicode-range` subset it can see — about 5 MB — into your build output whether or not your data uses them. Apps that do not import it are completely unaffected. Users only download the subsets their content actually touches (~910 KB for a typical first Japanese screen), and weight costs nothing extra since every weight shares one file.

Also adds `--astw-font-sans`, which replaces the whole font stack:

```css
:root {
  --astw-font-sans: "Your Brand Sans", ui-sans-serif, system-ui, sans-serif;
}
```

See [Typography and Fonts](https://github.com/tailor-platform/app-shell/blob/main/docs/concepts/styling-theming.md#typography-and-fonts).
