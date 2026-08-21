/**
 * Vendors the Noto Sans JP variable subsets that give Japanese text a real
 * weight axis. `globals.css` imports the generated stylesheet, so it is part of
 * `@tailor-platform/app-shell/styles` — no opt-in step.
 *
 * Runs from `build` and `dev` — pnpm does not run `pre*` lifecycle scripts by
 * default, so this is invoked explicitly rather than as a `prebuild` hook.
 *
 * Outputs (both gitignored — regenerated from the pinned devDependency so ~5 MB
 * of binaries stay out of git history):
 *   src/assets/fonts/files/noto-sans-jp-*.woff2
 *   src/assets/fonts/noto-sans-jp.css
 *
 * URLs are written as `./fonts/files/*.woff2`, matching `inter.css`: Tailwind
 * inlines this stylesheet into `dist/app-shell-core.css`, so they resolve
 * against the dist root. `publicDir: "src/assets"` puts the woff2 files at
 * `dist/fonts/files/`. The paths are deliberately unresolvable from
 * `src/assets/fonts/`, which is what stops Vite rewriting them at build time.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const corePkgDir = path.resolve(here, "..");
const assetsFonts = path.join(corePkgDir, "src/assets/fonts");
const filesDir = path.join(assetsFonts, "files");

const require = createRequire(path.join(corePkgDir, "package.json"));
const upstreamCss = require.resolve("@fontsource-variable/noto-sans-jp/wght.css");
const upstreamDir = path.dirname(upstreamCss);

/*
 * Metric harmonisation, measured in Chromium against Inter Variable rather than
 * derived from the font tables (see PR for the probe + screenshots):
 *
 *   Inter  cap height 0.727em, x-height 0.545em, fontBox ascent 0.97 descent 0.24
 *   Noto   kanji      0.795em, kana     0.794em, fontBox ascent 1.16 descent 0.29
 *
 * SIZE_ADJUST: Noto's kanji run 1.09x Inter's cap height, which reads oversized
 * next to Inter's large x-height in mixed strings. 94% was chosen from a rendered
 * sweep (88/90/92/94/96/100); above ~96% the Japanese dominates, below ~90% it
 * looks undersized.
 *
 * ASCENT/DESCENT: `size-adjust` also scales the override percentages, so these
 * are pre-divided by SIZE_ADJUST to land on Inter's actual 97%/24% box. Verified:
 * a Japanese-only line, a Latin-only line and a mixed line all measure 22px at
 * 16px/normal, against 25px for untuned Noto and 26px for the bare system font.
 */
const SIZE_ADJUST = 94;
const INTER_ASCENT = 97;
const INTER_DESCENT = 24;
const pct = (target) => `${Math.round((target / (SIZE_ADJUST / 100)) * 10) / 10}%`;

/*
 * The codepoints a Japanese UI needs — and deliberately nothing else.
 *
 * Both the Noto faces and the local fallback are clamped to this set. Upstream's
 * ranges also cover arrows, dingbats, geometric shapes, letterlike symbols and
 * enclosed alphanumerics, which are shared with Latin text: leaving them in meant
 * a Latin-only app pulled a Japanese subset the first time it rendered something
 * like the DataTable's boolean "✓" (U+2713). Those blocks are excluded, so they
 * resolve to Inter or the system font as they did before this font existed.
 *
 * Included on purpose: U+3200-33FF, which carries ㈱ ㍿ ㎡ — genuinely Japanese
 * typography rather than shared symbols. Excluded on purpose: ℃ (U+2103) and
 * ① (U+2460), which live in Latin-shared blocks; they render from the system font
 * even inside Japanese text, which is the cost of keeping Latin-only apps clean.
 */
const JP_BLOCKS = [
  [0x3000, 0x303f], // CJK symbols and punctuation
  [0x3040, 0x309f], // hiragana
  [0x30a0, 0x30ff], // katakana
  [0x3190, 0x319f], // kanbun
  [0x31f0, 0x31ff], // katakana phonetic extensions
  [0x3200, 0x32ff], // enclosed CJK letters and months — ㈱
  [0x3300, 0x33ff], // CJK compatibility — ㍿ ㎡
  [0x3400, 0x4dbf], // CJK unified ideographs extension A
  [0x4e00, 0x9fff], // CJK unified ideographs
  [0xf900, 0xfaff], // CJK compatibility ideographs
  [0xfe30, 0xfe4f], // CJK compatibility forms
  [0xff00, 0xffef], // halfwidth and fullwidth forms
  [0x20000, 0x2ffff], // extension B onward — rare and name kanji, 𠮷 𠮟
];

/** Parse a CSS `unicode-range` value into sorted [lo, hi] pairs. */
function parseRange(value) {
  const spans = [];
  for (const tok of value.split(",")) {
    const m = /^\s*U\+([0-9a-fA-F]+)(?:-([0-9a-fA-F]+))?\s*$/.exec(tok);
    if (!m) continue;
    const lo = parseInt(m[1], 16);
    spans.push([lo, m[2] ? parseInt(m[2], 16) : lo]);
  }
  return spans.toSorted((a, b) => a[0] - b[0]);
}

/** Clamp spans to JP_BLOCKS, merging anything adjacent that survives. */
function clampToJapanese(spans) {
  const kept = [];
  for (const [lo, hi] of spans) {
    for (const [blo, bhi] of JP_BLOCKS) {
      const s = Math.max(lo, blo);
      const e = Math.min(hi, bhi);
      if (s <= e) kept.push([s, e]);
    }
  }
  const merged = [];
  for (const span of kept.toSorted((x, y) => x[0] - y[0])) {
    const last = merged[merged.length - 1];
    if (last && span[0] <= last[1] + 1) last[1] = Math.max(last[1], span[1]);
    else merged.push([span[0], span[1]]);
  }
  return merged;
}

const hex = (n) => n.toString(16).toUpperCase().padStart(4, "0");
const serializeRange = (spans) =>
  spans.map(([lo, hi]) => (lo === hi ? `U+${hex(lo)}` : `U+${hex(lo)}-${hex(hi)}`)).join(", ");

/*
 * Local fallback ladder, rendered during `font-display: swap` and for glyphs the
 * subsets do not cover. `local()` matches PostScript names, not family names.
 *
 * The buckets exist because a single `100 500` bucket pointing at Regular made
 * `font-weight: 500` render as Regular — the exact bug this package is fixing,
 * and a regression on macOS, where the family sits ahead of `ui-sans-serif` and
 * so pre-empts the system cascade that would otherwise have found Hiragino W5.
 *
 * Hiragino W0-W9 verified present and distinct on macOS 15 (ink for 漢 at 150px:
 * W3 1.82M, W5 2.44M, W6 2.86M, W7 3.25M). The Windows names follow Microsoft's
 * naming convention but are unverified from macOS; an unresolvable `local()` is
 * skipped, so a wrong name degrades to the next entry rather than breaking.
 * Yu Gothic (non-UI) is tried before Yu Gothic UI at 500 because only the former
 * ships a true Medium.
 */
const FALLBACK_FACES = [
  {
    weight: "100 449",
    src: ["HiraginoSans-W3", "YuGothicUI-Regular", "YuGothic-Regular", "Meiryo"],
  },
  {
    weight: "450 549",
    src: ["HiraginoSans-W5", "YuGothic-Medium", "YuGothicUI-Semibold", "Meiryo"],
  },
  {
    weight: "550 649",
    src: ["HiraginoSans-W6", "YuGothicUI-Semibold", "YuGothic-Bold", "Meiryo-Bold"],
  },
  {
    weight: "650 900",
    src: ["HiraginoSans-W7", "YuGothicUI-Bold", "YuGothic-Bold", "Meiryo-Bold"],
  },
];

const NOTO_FAMILY = "Noto Sans JP Variable";
const FALLBACK_FAMILY = "AppShell JP Fallback";

function parseUpstream() {
  const css = fs.readFileSync(upstreamCss, "utf8");
  const faces = [
    ...css.matchAll(/url\(\.\/files\/([^)]+\.woff2)\)[\s\S]*?unicode-range:\s*([^;]+);/g),
  ].map(([, file, range]) => ({ file, range: range.replace(/\s+/g, " ").trim() }));
  if (faces.length === 0) throw new Error(`No @font-face blocks parsed from ${upstreamCss}`);
  return faces;
}

function syncWoff2(faces) {
  fs.mkdirSync(filesDir, { recursive: true });
  let copied = 0;
  for (const { file } of faces) {
    const from = path.join(upstreamDir, "files", file);
    const to = path.join(filesDir, file);
    const src = fs.statSync(from);
    const dst = fs.existsSync(to) ? fs.statSync(to) : null;
    if (dst && dst.size === src.size && dst.mtimeMs >= src.mtimeMs) continue;
    fs.copyFileSync(from, to);
    copied += 1;
  }
  return copied;
}

/** Remove vendored woff2 that no emitted face references (e.g. after the clamp changed). */
function pruneOrphanedWoff2(faces) {
  if (!fs.existsSync(filesDir)) return 0;
  const keep = new Set(faces.map(({ file }) => file));
  let removed = 0;
  for (const name of fs.readdirSync(filesDir)) {
    if (!name.startsWith("noto-sans-jp-") || keep.has(name)) continue;
    fs.rmSync(path.join(filesDir, name));
    removed += 1;
  }
  return removed;
}

function renderCss(faces) {
  const notoFaces = faces
    .map(({ file, range }) => ({ file, spans: clampToJapanese(parseRange(range)) }))
    // A subset whose range is entirely non-Japanese (upstream's latin, cyrillic,
    // greek and vietnamese slices) is unreachable behind Inter anyway — drop it.
    .filter(({ spans }) => spans.length > 0)
    .map(
      ({ file, spans }) => `@font-face {
  font-family: "${NOTO_FAMILY}";
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  size-adjust: ${SIZE_ADJUST}%;
  ascent-override: ${pct(INTER_ASCENT)};
  descent-override: ${pct(INTER_DESCENT)};
  line-gap-override: 0%;
  src: url(./fonts/files/${file}) format("woff2-variations");
  unicode-range: ${serializeRange(spans)};
}`,
    );

  const fallbackFaces = FALLBACK_FACES.map(
    ({ weight, src }) => `@font-face {
  font-family: "${FALLBACK_FAMILY}";
  font-style: normal;
  font-weight: ${weight};
  size-adjust: ${SIZE_ADJUST}%;
  ascent-override: ${pct(INTER_ASCENT)};
  descent-override: ${pct(INTER_DESCENT)};
  line-gap-override: 0%;
  src: ${src.map((n) => `local("${n}")`).join(", ")};
  unicode-range: ${serializeRange(JP_BLOCKS)};
}`,
  );

  return `/*
 * Japanese font faces for @tailor-platform/app-shell, included in
 * \`@tailor-platform/app-shell/styles\` via globals.css.
 *
 * System Japanese fonts do not ship a 500 weight (Yu Gothic UI on Windows has
 * Light/Semilight/Regular/Semibold/Bold), so CSS weight matching resolves
 * \`font-weight: 500\` down to Regular and \`font-medium\` becomes invisible in
 * Japanese text. Noto Sans JP is a variable font with a continuous 100-900 axis,
 * so every weight the design system names is real.
 *
 * The default stack that references these families lives in theme.bridge.css.
 * This file deliberately does not set --app-shell-font-sans: that variable is the
 * consumer override, and must stay unset so \`var(--app-shell-font-sans, <default>)\`
 * falls through. Each face carries a unicode-range, so a build that never
 * renders Japanese downloads none of them.
 *
 * GENERATED by scripts/sync-noto-fonts.mjs — do not edit by hand.
 * Noto Sans JP is licensed under the SIL Open Font License 1.1; see
 * NOTO-SANS-JP-LICENSE.txt alongside this file.
 */

${notoFaces.join("\n\n")}

/*
 * Metric-matched local fallback. Rendered during \`font-display: swap\` and for
 * any glyph the subsets above do not cover. Carries the same \`size-adjust\` as the
 * Noto faces plus Inter's line box, so a subset arriving mid-scroll changes
 * neither row heights nor advance widths. Weight is bucketed so that 500 lands on
 * a real medium rather than collapsing to Regular.
 */
${fallbackFaces.join("\n\n")}
`;
}

function syncLicense() {
  const from = path.join(upstreamDir, "LICENSE");
  const to = path.join(assetsFonts, "NOTO-SANS-JP-LICENSE.txt");
  if (fs.existsSync(from)) fs.copyFileSync(from, to);
}

const parsed = parseUpstream();
/*
 * Subsets left empty by the Japanese clamp are upstream's latin/cyrillic/greek/
 * vietnamese slices and symbol-only ranges. Nothing can reach them behind Inter,
 * so neither the face nor the file is shipped.
 */
const faces = parsed.filter(({ range }) => clampToJapanese(parseRange(range)).length > 0);
const copied = syncWoff2(faces);
pruneOrphanedWoff2(faces);
fs.writeFileSync(path.join(assetsFonts, "noto-sans-jp.css"), renderCss(faces));
syncLicense();
console.log(
  `sync-noto-fonts: ${parsed.length} subsets upstream, ${faces.length} shipped after clamping to ` +
    `Japanese (${copied} copied, ${faces.length - copied} current), size-adjust ${SIZE_ADJUST}%, ` +
    `ascent ${pct(INTER_ASCENT)}, descent ${pct(INTER_DESCENT)}`,
);
