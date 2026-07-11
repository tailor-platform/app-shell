/**
 * Regenerates `src/lib/default-favicon.ts` from the raw favicon files in
 * `src/lib/favicons/`. Each asset is embedded as a base64 data URI so the whole
 * favicon set ships in the JS bundle with no asset-copy step in consuming apps.
 *
 * Run after replacing the source files:
 *
 *     node scripts/gen-favicons.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(HERE, "..", "src", "lib", "favicons");
const OUT = join(HERE, "..", "src", "lib", "default-favicon.ts");

const toDataUri = (file, mime) => {
  const b64 = readFileSync(join(SRC_DIR, file)).toString("base64");
  return `data:${mime};base64,${b64}`;
};

// Each entry maps a file in ./favicons to the data-URI const it becomes.
const assets = [
  { const: "FAVICON_ICO", file: "favicon.ico", mime: "image/x-icon" },
  { const: "FAVICON_16", file: "favicon-16x16.png", mime: "image/png" },
  { const: "FAVICON_32", file: "favicon-32x32.png", mime: "image/png" },
  { const: "FAVICON_192", file: "android-chrome-192x192.png", mime: "image/png" },
  { const: "FAVICON_512", file: "android-chrome-512x512.png", mime: "image/png" },
  { const: "APPLE_TOUCH_ICON", file: "apple-touch-icon.png", mime: "image/png" },
];

const uris = Object.fromEntries(assets.map((a) => [a.const, toDataUri(a.file, a.mime)]));

const header = `/**
 * Bundled default favicons for AppShell.
 *
 * Historically AppShell shipped a single 32×32 Tailor mark. It now bundles the
 * full favicon set (the \`favicon_io\` output: a multi-resolution \`.ico\`, 16/32
 * PNGs, the 192/512 PWA icons, and the 180×180 Apple touch icon). Each asset is
 * embedded as a base64 data URI so the whole set ships in the JS bundle and
 * needs no asset-copy step in the consuming app. \`<DocumentHead>\` injects the
 * entire {@link DEFAULT_FAVICONS} list as \`<link>\` tags when a consumer passes
 * no \`favicon\` prop and the host page declares no \`<link rel="icon">\`.
 *
 * Consumers still override the whole set by passing \`favicon\` (any href: a
 * public-path URL such as \`/favicon.ico\`, or a data URI).
 *
 * DO NOT EDIT THE DATA URIS BY HAND. The raw source files live in
 * \`./favicons/\`; regenerate this file with \`node scripts/gen-favicons.mjs\`.
 */

/** A single favicon \`<link>\` descriptor rendered by \`<DocumentHead>\`. */
export type FaviconLink = {
  /** The link relationship — \`"icon"\` for tab favicons, \`"apple-touch-icon"\` for iOS. */
  rel: "icon" | "apple-touch-icon";
  /** The favicon href (a bundled data URI, or a consumer-provided URL). */
  href: string;
  /** MIME type hint so browsers can prioritise the right format. */
  type?: string;
  /** Pixel dimensions (e.g. \`"32x32"\`) so browsers pick the best-fit icon. */
  sizes?: string;
};
`;

const constLines = assets.map((a) => `const ${a.const} =\n  "${uris[a.const]}";`).join("\n\n");

const listBody = `/**
 * The full default favicon set, ordered from the classic \`.ico\` fallback up
 * through the high-resolution PWA icons and the Apple touch icon.
 */
export const DEFAULT_FAVICONS: FaviconLink[] = [
  { rel: "icon", type: "image/x-icon", href: FAVICON_ICO },
  { rel: "icon", type: "image/png", sizes: "16x16", href: FAVICON_16 },
  { rel: "icon", type: "image/png", sizes: "32x32", href: FAVICON_32 },
  { rel: "icon", type: "image/png", sizes: "192x192", href: FAVICON_192 },
  { rel: "icon", type: "image/png", sizes: "512x512", href: FAVICON_512 },
  { rel: "apple-touch-icon", sizes: "180x180", href: APPLE_TOUCH_ICON },
];
`;

const content = `${header}\n${constLines}\n\n${listBody}`;
writeFileSync(OUT, content);
console.log(`Wrote ${OUT} (${Buffer.byteLength(content)} bytes)`);
