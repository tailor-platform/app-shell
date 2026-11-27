---
kind: prose
group: coding-agents
title: Coding Agents
description: Point coding agents at the docs shipped inside the AppShell package, through your repo's AGENTS.md
---

# Coding Agents

AppShell ships its docs inside the package, at `node_modules/@tailor-platform/app-shell/dist/docs/`, so they always match the version you have installed. A guide at `dist/docs/AGENTS.md` indexes them and lists the rules lint can't check. Point your `AGENTS.md` at that guide and agents get both at the start of every session.

Skills only load when something triggers them, so an agent can build a whole screen without ever opening one. A line in `AGENTS.md` is always there.

## What ships

- **`dist/docs/AGENTS.md`**, the guide: an index of the docs by category (pages, patterns, components, hooks and functions, concepts), and rules such as one primary action per view and forms going through `Form` and `Field`. It names the AppShell version it was built from.
- **`dist/docs/<category>/<slug>.md`**, the docs themselves, the same ones published in this repo's `docs/` folder.

The guide's path is stable across releases. Upgrading AppShell updates the guide and the docs, so whatever points at them doesn't need to change.

## Pointing agents at the guide

### erp-kit projects

From erp-kit 0.60.0, `erp-kit update agents` adds and maintains an AppShell block in the `AGENTS.md` of every package that depends on AppShell, and keeps it out of packages that don't. `erp-kit app init` does the same for a new app. See the erp-kit docs for the details. On an older erp-kit, upgrade it or add the line by hand as below.

### Everything else

Add this to the `AGENTS.md` in the package that depends on `@tailor-platform/app-shell`:

```md
## AppShell UI

This package builds its UI with AppShell. Whatever you know of AppShell's API may not match the installed version, so before you write or change UI code here, read the guide for it:

@node_modules/@tailor-platform/app-shell/dist/docs/AGENTS.md
```

The path is relative to the file it's in. To put the line in the repo root `AGENTS.md` instead, include the package folder, such as `@apps/web/node_modules/@tailor-platform/app-shell/dist/docs/AGENTS.md`. With npm, Yarn or Bun workspaces AppShell may be hoisted to the root `node_modules`, so check where it actually landed.

## How each tool loads it

- **Claude Code, Amp and Gemini CLI** read a line that starts with `@` as an import, and load the guide into the session along with `AGENTS.md`. Claude Code reads `AGENTS.md` by itself only when there's no `CLAUDE.md`; otherwise add a line with `@AGENTS.md` to the `CLAUDE.md`. Gemini CLI reads `GEMINI.md` by default, so it needs `AGENTS.md` added to its `context.fileName` setting.
- **Codex, Cursor, Copilot and others** have no import syntax. They see the line as a path and open the guide when they follow the instruction to read it.

`node_modules` is gitignored, so agents need the exact path rather than finding the guide by search. Before dependencies are installed the file doesn't exist yet, and Claude Code skips a missing import quietly.

Claude Code follows an import without asking only when it points inside the folder the session was started in. An import that points outside it, such as a root `AGENTS.md` pointing at a hoisted `node_modules` from a session started in a package, needs a one-time approval for the project. Where the import isn't followed, the line still loads as text, so the agent can open the path itself.

Yarn Plug'n'Play keeps packages in zip files, so there is no docs folder on disk. Use a `node_modules` install.

## Skills

The `app-shell-patterns` skill in the package's `skills/` folder reads the same docs. It no longer carries its own copy: it finds them in `node_modules`, so the skill and the guide always agree on the installed version. Its `references/` folder only holds short pointers, so a copy of an older skill in your repo, or an old link, sends the agent to the right place.
