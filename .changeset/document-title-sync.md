---
"@tailor-platform/app-shell": minor
---

Manage the browser tab from AppShell — title and favicon.

- **Title**: AppShell now keeps `document.title` in sync with the active route as `"<page> · <title>"`, where `<page>` is the current breadcrumb leaf (including any `useOverrideBreadcrumb` override, so detail pages show their record name automatically) and `<title>` is the `title` prop passed to `<AppShell>`. Works for every page with no per-page wiring; when no `title` is set the tab shows just the page name, and when nothing resolves the static `index.html` title is left untouched.
- **Favicon**: new `favicon` prop on `<AppShell>` sets the document favicon (any `<link rel="icon">` href — a public-path URL or a data URI), updating the existing link from `index.html` in place. When omitted it defaults to the bundled Tailor favicon, so apps get correct branding out of the box.
