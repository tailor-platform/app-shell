---
"@tailor-platform/app-shell": minor
---

Sync the browser tab title (`document.title`) with the active route. AppShell now sets the tab to `"<page> · <title>"`, where `<page>` is the current breadcrumb leaf (including any `useOverrideBreadcrumb` override, so detail pages show their record name automatically) and `<title>` is the `title` prop passed to `<AppShell>`. Works for every page with no per-page wiring; when no `title` is set the tab shows just the page name, and when nothing resolves the static `index.html` title is left untouched.
