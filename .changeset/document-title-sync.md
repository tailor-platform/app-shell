---
"@tailor-platform/app-shell": minor
---

Manage the browser tab from AppShell — title and favicon.

- **Title**: AppShell now keeps `document.title` in sync with the active route as `"<page> · <title>"`, where `<page>` is the current breadcrumb leaf (including any `useOverrideBreadcrumb` override, so detail pages show their record name automatically) and `<title>` is the `title` prop passed to `<AppShell>`. Works for every page with no per-page wiring; when no `title` is set the tab shows just the page name.
- **Favicon**: new `favicon` prop on `<AppShell>` sets the document favicon (any `<link rel="icon">` href — a public-path URL or a data URI). When omitted it defaults to the bundled Tailor favicon, so apps get correct branding out of the box.

Both are rendered declaratively (React 19 hoists `<title>`/`<link rel="icon">` into `<head>`), so it works in client-only apps, streaming SSR, and Server Components.

**Migration for consumers**: AppShell now owns these tags. Pass `title` (and optionally `favicon`) to `<AppShell>`, and **remove the static `<title>` and `<link rel="icon">` from your `index.html`** — React does not de-duplicate against tags it did not render, so leaving them produces a duplicate `<title>`/favicon. Delete any custom `document.title` effect you had.
