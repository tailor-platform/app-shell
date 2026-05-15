import type { Font, Theme } from "@/contexts/theme-context";

type Options = {
  /** localStorage key for the color palette. Default matches `AppShell`. */
  storageKey?: string;
  /** localStorage key for the font axis. Default matches `AppShell`. */
  fontStorageKey?: string;
  /** Palette to use when nothing is stored. Default `"bloom"`. */
  defaultTheme?: Theme;
  /** Font to use when nothing is stored. Default `"geist"`. */
  defaultFont?: Font;
};

/**
 * Returns the source of a tiny script consumers inline in `<head>` so the
 * stored palette / font axis is applied **before first paint**, preventing
 * the FOUC and React hydration warnings that otherwise happen because
 * `ThemeProvider` only writes `<html data-theme=…>` from a post-mount effect.
 *
 * Usage (Next.js App Router):
 *
 * ```tsx
 * // app/layout.tsx
 * import { getInitialAppearanceScript } from "@tailor-platform/app-shell";
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html suppressHydrationWarning>
 *       <head>
 *         <script dangerouslySetInnerHTML={{ __html: getInitialAppearanceScript() }} />
 *       </head>
 *       <body>{children}</body>
 *     </html>
 *   );
 * }
 * ```
 *
 * Usage (Vite / static HTML): paste the returned string into a `<script>`
 * tag inside `index.html`'s `<head>` (typically generated at build time, or
 * hand-copied for a fixed configuration).
 */
export function getInitialAppearanceScript(options: Options = {}): string {
  const storageKey = options.storageKey ?? "appshell-ui-theme";
  const fontStorageKey = options.fontStorageKey ?? "appshell-ui-font";
  const defaultTheme = options.defaultTheme ?? "bloom";
  const defaultFont = options.defaultFont ?? "geist";

  // Serialised constants kept in sync with `contexts/theme-context.tsx`.
  const themes = JSON.stringify(["light", "dark", "cream", "bloom", "system"]);
  const fonts = JSON.stringify(["geist", "inter"]);
  const legacy = JSON.stringify({
    "tailor-light": "cream",
    "tailor-bloom": "bloom",
    "tailor-dark": "dark",
  });

  // Minified IIFE — kept literal so consumers can read it. The trailing newline
  // is intentional; it makes the inlined `<script>` block easier to inspect in
  // devtools when something goes wrong.
  return `(()=>{try{var d=document.documentElement,L=${legacy},T=${themes},F=${fonts};
var rawT=localStorage.getItem(${JSON.stringify(storageKey)})||${JSON.stringify(defaultTheme)};
var t=L[rawT]||(T.indexOf(rawT)>-1?rawT:${JSON.stringify(defaultTheme)});
if(t==="system"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}
d.dataset.theme=t;d.classList.remove("light","dark");d.classList.add(t==="dark"?"dark":"light");
var rawF=localStorage.getItem(${JSON.stringify(fontStorageKey)})||${JSON.stringify(defaultFont)};
d.dataset.font=F.indexOf(rawF)>-1?rawF:${JSON.stringify(defaultFont)};
}catch(e){}})();`;
}
