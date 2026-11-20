---
"@tailor-platform/app-shell": minor
---

Add an `app-shell` CLI that puts a short AppShell block in your repo's `AGENTS.md`, so coding agents read the docs for the installed version without a skill having to trigger. The package now ships its docs at `dist/docs/`, with a guide at `dist/docs/AGENTS.md` that indexes them and lists the house rules. The block points at that guide (as an `@` import, which Claude Code, Amp and Gemini CLI load directly), so upgrading AppShell updates the guide without changing your `AGENTS.md`. This follows the pattern Next.js uses for its bundled docs.

Run this once from the package that depends on AppShell:

```bash
pnpm exec app-shell agents init
```

Pass `--add-prepare` to also refresh the block from the package's `prepare` script, and `--target <path>` to write to a file other than the repo root `AGENTS.md`. Delete the block to opt out.

The `app-shell-patterns` skill no longer carries its own copy of the docs. It reads them from the installed package, and its `references/` folder now holds pointers to the new location. If you keep a copy of the skill in your repo, replace it with the one in the installed package's `skills/` folder.
