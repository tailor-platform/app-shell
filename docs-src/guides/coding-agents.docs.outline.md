---
kind: prose
group: coding-agents
title: Coding Agents
description: Add an always-loaded AppShell block to your repo's AGENTS.md so coding agents know the docs and the rules from the start of a session
---

# Coding Agents

AppShell ships its docs inside the package, so they always match the version you have installed. The `app-shell` CLI adds a short block to your repo's `AGENTS.md` that points coding agents at those docs.

The block is read at the start of every session. Skills only load when something triggers them, so an agent can build a whole screen without ever opening one. The block is the part that is always there.

## Set it up

Run this once, from the package that depends on `@tailor-platform/app-shell` (in a monorepo that is the frontend package, not the repo root):

```bash
pnpm exec app-shell agents init
```

It adds the block to `AGENTS.md` at the repo root, creating the file if there isn't one. It also prints a notice when:

- The repo has a `CLAUDE.md` that doesn't import `@AGENTS.md`. Claude Code ignores `AGENTS.md` in that case, so add a line with `@AGENTS.md` to it.
- There is more than one `AGENTS.md` between the package and the repo root. Agents differ on which of them they load, and some only read the nearest one, so check that agents working in the package will see the block. Use `--target` to move it.

`init` doesn't touch `package.json` unless you pass `--add-prepare` (see [Keeping it current](#keeping-it-current)).

Commit the `AGENTS.md` change.

## What the block contains

The block is kept short and stable. It says which package uses AppShell, names the docs folder (`<your package>/node_modules/@tailor-platform/app-shell/dist/docs/`), and tells agents to read the guide in it:

```md
@apps/web/node_modules/@tailor-platform/app-shell/dist/docs/AGENTS.md
```

That guide is where the detail lives: an index of the docs by category (pages, patterns, components, hooks and functions, concepts), and the rules lint can't check, such as one primary action per view and forms going through `Form` and `Field`. It ships with the package, so it updates when you upgrade AppShell without changing your `AGENTS.md`.

How agents pick the guide up depends on the tool:

- **Claude Code, Amp and Gemini CLI** read a line that starts with `@` as an import, and load the guide into the session along with `AGENTS.md`. Gemini CLI reads `GEMINI.md` by default, so it needs `AGENTS.md` added to its `context.fileName` setting.
- **Codex, Cursor, Copilot and others** have no import syntax. They see the line as a path and open the guide when they follow the instruction to read it.

The path is gitignored, so agents need the exact path rather than finding it by search, which is why the block spells it out. Before `pnpm install` the file doesn't exist yet, and Claude Code skips a missing import quietly.

The block has no version number. It only changes if the docs move inside the package or the block's own wording changes. This follows Next.js, whose `AGENTS.md` block is a short pointer into the docs bundled at `node_modules/next/dist/docs/`. One difference: our guide indexes the docs, and Next's doesn't. Models already know the shape of Next.js and only need its current details. They know next to nothing about AppShell, so the index is their only map of what exists.

### Starting an agent inside a package

Claude Code only follows an import that points inside the folder it was started in. The block lives at the repo root but points into the frontend package, so:

- **Started at the repo root, or inside the frontend package:** the guide loads. Claude Code also reads the `AGENTS.md` files above the folder it starts in, so the root block is picked up from inside the package too.
- **Started in another folder**, such as a backend package next to the frontend: the guide points outside that folder, so Claude Code skips it. The rest of the block still loads, including the path to the guide.

If people regularly start agents in another folder and still work on the frontend from there, have them start in the frontend package or the repo root instead.

Some tools only read the `AGENTS.md` nearest to the folder they work in. If the frontend package has its own `AGENTS.md`, `init` points this out. Run it with `--target .` from the package to put the block in that file, so tools that stop at the nearest file still see it.

The block sits between two HTML comment markers that carry the package path:

```md
<!-- app-shell:agents:start apps/web -->

…

<!-- app-shell:agents:end apps/web -->
```

A repo with two frontends gets two blocks, and each package only rewrites its own. Anything you write outside the markers is left alone. Anything inside them is overwritten on the next refresh.

## Keeping it current

Upgrading AppShell updates the guide and the docs with it, so most upgrades leave the block alone. A release that changes the block itself says so in its changelog. Refresh it by running this from the same package:

```bash
pnpm exec app-shell agents sync
```

`sync` rewrites only what's between the markers, and only when the content changed. It does nothing if the block isn't there, and never creates the file.

### Refreshing on install (`--add-prepare`)

To have this happen on its own, pass `--add-prepare` to `init`:

```bash
pnpm exec app-shell agents init --add-prepare
```

This adds `app-shell agents sync` to the package's `prepare` script, chaining it after an existing one with `&&`. `sync` then runs whenever `pnpm install` installs something, so a changed block is picked up as part of the upgrade.

The trade-offs:

- **Pros:** nobody has to remember to run `sync` when a release changes the block.
- **Cons:** it changes your `package.json`, and when the block does change, the `AGENTS.md` diff shows up after whichever install picks it up, including in PRs that aren't about AppShell.
- **Not covered:** `pnpm add @tailor-platform/app-shell@x` doesn't run `prepare`, and Renovate and Dependabot PRs don't run scripts. The block is refreshed by the next install on someone's machine.

`sync` is kept quiet so it's safe in `prepare`: it does nothing when `CI` is set, and it always exits 0, so it can't fail an install.

## Writing to a different file

By default the block goes in `AGENTS.md` at the repo root, found by walking up from the package to the directory that holds `.git` (or `pnpm-workspace.yaml` when there is no `.git`). Pass `--target` to put it somewhere else:

```bash
pnpm exec app-shell agents init --target ../../docs/AGENTS.md
```

The path is relative to the package you run it from. Pass the same `--target` to `sync`. With `--add-prepare`, `init` writes it into the `prepare` script for you. Paths inside the block are relative to the directory of the file it lives in.

## Skills

The `app-shell-patterns` skill in the package's `skills/` folder reads the same docs. It no longer carries its own copy: it finds the docs folder from the block in `AGENTS.md`, or by looking in `node_modules`, so the skill and the block always agree on the installed version. Its `references/` folder only holds short pointers, so a copy of an older skill in your repo, or an old link, sends the agent to the right place.

## Opting out

Delete the block, markers included. `sync` does nothing when it can't find its markers and never creates the file, so a leftover `prepare` line is harmless. Remove it too if you want a clean `package.json`.
