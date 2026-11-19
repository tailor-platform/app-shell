---
"@tailor-platform/app-shell": minor
---

Add an `app-shell` CLI that puts an always-loaded AppShell block in your repo's `AGENTS.md`, so coding agents know where the docs are and which rules to follow without a skill having to trigger. The package now ships its docs at `dist/docs/` (`node_modules/@tailor-platform/app-shell/dist/docs/`), and the block indexes them.

Run this once from the package that depends on AppShell:

```bash
pnpm exec app-shell agents init
```

It adds the block to the repo root `AGENTS.md`. Run `app-shell agents sync` after upgrading to refresh it, or pass `--add-prepare` to `init` to have the package's `prepare` script do that on install. `sync` only rewrites what is between its markers, does nothing in CI, and never fails an install. Delete the block to opt out. Use `--target <path>` to write to a different file.
