---
name: app-shell-patterns
description: "Best-practice UI patterns and correct component usage for apps using @tailor-platform/app-shell. Use when building or editing screens, pages, lists, tables, detail views, forms, modals, dialogs, wizards, or bulk/confirm/toast interactions; choosing AppShell components, layouts, or design tokens; upgrading app-shell; or diagnosing styling, theming, or dark-mode breakage after a version bump."
---

# App-Shell Patterns

Build with AppShell's documented components and patterns. Detailed guidance and the
content catalogue live in the documentation bundled with the installed package,
not in this skill. Those docs are authoritative for the app's installed version.

## Find the documentation

Run the bundled discovery script, resolving its path relative to this skill:

```bash
node <path-to-this-skill>/scripts/discover-docs.mjs [workspace-directory]
```

The optional directory is the application workspace that depends on
`@tailor-platform/app-shell`; it defaults to the current working directory.
In a monorepo, use the depending workspace, not necessarily the repository root.
The script prints the absolute path to the installed package's `docs/index.md`.
If discovery fails, follow the diagnostic; do not silently substitute docs from
GitHub's latest version or upgrade the dependency without the user's approval.

## Work from the index

1. Read the discovered `docs/index.md` before implementation. Follow its reading
   routes and implementation rules; resolve its links relative to that index.
2. Read the selected page/pattern, the relevant concept guidance, and exact
   component/hook APIs before using them. Do not load every document at once.
3. For upgrades, or styling/theming/dark-mode regressions after an upgrade, read
   `migrations.md` even when the build succeeds.
4. Implement from the documented imports and examples, then validate the change
   with the application's existing checks.
