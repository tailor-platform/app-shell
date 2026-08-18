/**
 * Vendors the Noto Sans JP variable subsets that back the opt-in Japanese font
 * bundle (`@tailor-platform/app-shell/fonts/noto-sans-jp`).
 *
 * Runs from `build` and `dev` — pnpm does not run `pre*` lifecycle scripts by
 * default, so this is invoked explicitly rather than as a `prebuild` hook.
 *
 * Outputs (both gitignored — regenerated from the pinned devDependency so ~5 MB
 * of binaries stay out of git history):
 *   src/assets/fonts/files/noto-sans-jp-*.woff2
 *   src/assets/fonts/noto-sans-jp.css
 *
 * `publicDir: "src/assets"` copies both into `dist/`, so the emitted stylesheet
 * lands at `dist/fonts/noto-sans-jp.css` and resolves `./files/*.woff2` against
 * `dist/fonts/`. Note this differs from `inter.css`, whose `./fonts/files/*`
 * URLs resolve against the dist root because Tailwind inlines it into
 * `dist/app-shell-core.css`.
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

/** Kana, CJK, and the fullwidth/halfwidth forms — keeps the fallback off Latin. */
const JP_RANGE = [
  "U+3000-303F",
  "U+3040-309F",
  "U+30A0-30FF",
  "U+3400-4DBF",
  "U+4E00-9FFF",
  "U+F900-FAFF",
  "U+FF00-FFEF",
].join(", ");

/*
 * `local()` matches PostScript / full names, never family names — `local("Hiragino
 * Sans")` silently fails where `local("HiraginoSans-W3")` resolves. Verified on
 * macOS; the Windows names follow the same convention but could not be checked on
 * this platform. An unresolvable `local()` is skipped harmlessly, so a wrong name
 * degrades to today's behaviour rather than breaking.
 */
const FALLBACK_FACES = [
  {
    weight: "100 500",
    src: ["HiraginoSans-W3", "YuGothicUI-Regular", "YuGothic-Regular", "Meiryo"],
  },
  {
    weight: "501 900",
    src: ["HiraginoSans-W6", "YuGothicUI-Bold", "YuGothic-Bold", "Meiryo-Bold"],
  },
];

const FALLBACK_FAMILY = "AppShell JP Fallback";
const NOTO_FAMILY = "Noto Sans JP Variable";

const STACK = [
  '"Inter Variable"',
  '"Inter"',
  `"${NOTO_FAMILY}"`,
  `"${FALLBACK_FAMILY}"`,
  "ui-sans-serif",
  "system-ui",
  "sans-serif",
];

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

function renderCss(faces) {
  const notoFaces = faces.map(
    ({ file, range }) => `@font-face {
  font-family: "${NOTO_FAMILY}";
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  size-adjust: ${SIZE_ADJUST}%;
  ascent-override: ${pct(INTER_ASCENT)};
  descent-override: ${pct(INTER_DESCENT)};
  line-gap-override: 0%;
  src: url(./files/${file}) format("woff2-variations");
  unicode-range: ${range};
}`,
  );

  const fallbackFaces = FALLBACK_FACES.map(
    ({ weight, src }) => `@font-face {
  font-family: "${FALLBACK_FAMILY}";
  font-style: normal;
  font-weight: ${weight};
  ascent-override: ${INTER_ASCENT}%;
  descent-override: ${INTER_DESCENT}%;
  line-gap-override: 0%;
  src: ${src.map((n) => `local("${n}")`).join(", ")};
  unicode-range: ${JP_RANGE};
}`,
  );

  return `/*
 * Opt-in Japanese font bundle for @tailor-platform/app-shell.
 *
 *   import "@tailor-platform/app-shell/styles";
 *   import "@tailor-platform/app-shell/fonts/noto-sans-jp";
 *
 * System Japanese fonts do not ship a 500 weight (Yu Gothic UI on Windows has
 * Light/Semilight/Regular/Semibold/Bold), so CSS weight matching resolves
 * \`font-weight: 500\` down to Regular and \`font-medium\` becomes invisible in
 * Japanese text. Noto Sans JP is a variable font with a continuous 100-900 axis,
 * so every weight the design system names is real.
 *
 * Importing this sets --astw-font-sans, which the compiled stylesheet reads.
 * To customise further, set --astw-font-sans yourself *after* this import.
 *
 * GENERATED by scripts/sync-noto-fonts.mjs — do not edit by hand.
 * Noto Sans JP is licensed under the SIL Open Font License 1.1; see
 * NOTO-SANS-JP-LICENSE.txt alongside this file.
 */

${notoFaces.join("\n\n")}

/*
 * Metric-matched local fallback. Rendered during \`font-display: swap\` and for
 * any glyph the subsets above do not cover, with Inter's line box forced onto
 * whichever system font resolves — so streaming a subset in mid-scroll does not
 * change row heights.
 */
${fallbackFaces.join("\n\n")}

:root {
  --astw-font-sans: ${STACK.join(", ")};
}
`;
}

function syncLicense() {
  const from = path.join(upstreamDir, "LICENSE");
  const to = path.join(assetsFonts, "NOTO-SANS-JP-LICENSE.txt");
  if (fs.existsSync(from)) fs.copyFileSync(from, to);
}

const faces = parseUpstream();
const copied = syncWoff2(faces);
fs.writeFileSync(path.join(assetsFonts, "noto-sans-jp.css"), renderCss(faces));
syncLicense();
console.log(
  `sync-noto-fonts: ${faces.length} subsets (${copied} copied, ${faces.length - copied} current), ` +
    `size-adjust ${SIZE_ADJUST}%, ascent ${pct(INTER_ASCENT)}, descent ${pct(INTER_DESCENT)}`,
);
