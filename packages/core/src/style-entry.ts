/*
 * This file exists only for the library build.
 *
 * We intentionally keep `src/index.ts` free of CSS imports because Vitest and
 * similar Node-evaluated test setups can externalize `@tailor-platform/app-shell`
 * and execute its JS entry directly in Node. If that JS entry imports CSS,
 * consumers end up needing test-runner-specific workarounds like
 * `server.deps.inline` just to load the package.
 *
 * The package still needs to publish `dist/app-shell.css` for the public
 * `@tailor-platform/app-shell/styles` export, so Vite gets a separate internal
 * entry whose only job is to pull `globals.css` into the library build.
 *
 * In short:
 * - `index.ts` stays CSS-free for JS consumers and test runners
 * - this file exists so the stylesheet continues to be emitted for `/styles`
 */
import "./globals.css";
