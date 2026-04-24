---
"@tailor-platform/app-shell": patch
---

Fix root page (`/`) title not being resolved correctly by `SidebarItem`:

- `appShellPageProps.meta.title` set in `src/pages/page.tsx` is now correctly picked up by `SidebarItem to="/"` — previously the root module was excluded from `modules` so `usePageMeta("/")` could never find it.
- Root module (`path: ""`) is now included in `modules` passed to `AppShell` so `usePageMeta` can resolve its title and icon.
- Auto-generated sidebar navigation now renders the root page with URL `"/"` instead of an empty string.
- When no `meta.title` is provided, the fallback now correctly yields `"Home"` instead of `"/"`.
