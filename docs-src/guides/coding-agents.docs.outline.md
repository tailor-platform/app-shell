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

With npm, use `npx app-shell agents init`.

By default `init` changes one file. It writes the block into the `AGENTS.md` at the repo root, which is the nearest folder at or above the package that holds `.git`, and creates the file if there isn't one. In a monorepo the block goes in the root file, not in the frontend package, because the root file is the one agents load wherever in the repo they start. Running `init` again updates the block in place.

It doesn't change `package.json`. The block is then refreshed by hand: run `app-shell agents sync` after you upgrade AppShell, and `init` prints a reminder that says so. To have installs refresh it instead, pass `--add-prepare` (see [Keeping it current](#keeping-it-current)).

It also prints a notice when:

- There is a `CLAUDE.md` next to the `AGENTS.md` that doesn't import it. Claude Code ignores `AGENTS.md` in that case, so add a line with `@AGENTS.md` to the `CLAUDE.md`.
- There is more than one `AGENTS.md` between the package and the repo root. Agents differ on which of them they load, and some only read the nearest one, so check that agents working in the package will see the block. Use `--target` to move it.

Commit the `AGENTS.md` change.

## What the block contains

The block is kept short and stable. It says which package uses AppShell, names the docs folder (`<your package>/node_modules/@tailor-platform/app-shell/dist/docs/`), and tells agents to read the guide in it:

```md
@apps/web/node_modules/@tailor-platform/app-shell/dist/docs/AGENTS.md
```

That guide is where the detail lives: an index of the docs by category (pages, patterns, components, hooks and functions, concepts), and the rules lint can't check, such as one primary action per view and forms going through `Form` and `Field`. It ships with the package, so it updates when you upgrade AppShell without changing your `AGENTS.md`.

How agents pick the guide up depends on the tool:

- **Claude Code, Amp and Gemini CLI** read a line that starts with `@` as an import, and load the guide into the session along with `AGENTS.md`. Claude Code reads `AGENTS.md` by itself only when the repo has no `CLAUDE.md`, and only from v2.1.277; otherwise it needs the `@AGENTS.md` line in a `CLAUDE.md`. Gemini CLI reads `GEMINI.md` by default, so it needs `AGENTS.md` added to its `context.fileName` setting.
- **Codex, Cursor, Copilot and others** have no import syntax. They see the line as a path and open the guide when they follow the instruction to read it.

The path is gitignored, so agents need the exact path rather than finding it by search, which is why the block spells it out. Before `pnpm install` the file doesn't exist yet, and Claude Code skips a missing import quietly.

The block has no version number. It only changes if a release changes the block's wording or moves the docs inside the package, or if the path to the installed package changes. This follows Next.js, whose `AGENTS.md` block is a short pointer into the docs bundled at `node_modules/next/dist/docs/`. One difference: our guide indexes the docs, and Next's doesn't. Models already know the shape of Next.js and only need its current details. They know next to nothing about AppShell, so the index is their only map of what exists.

### Markers

The block sits between two HTML comment markers that carry the package path:

```md
<!-- app-shell:agents:start apps/web -->

…

<!-- app-shell:agents:end apps/web -->
```

Anything you write outside the markers is left alone. Anything inside them is overwritten on the next refresh.

### More than one frontend

Run `init` in each package that depends on AppShell. Each one adds its own block, so a repo with two frontends ends up with two blocks in the same root `AGENTS.md`. They are separate because each points at its own package's install, and the two packages can be on different AppShell versions. Each package only rewrites its own block. Claude Code then loads the guide once per frontend.

### Where you start the agent

Claude Code follows an import without asking only when it points inside the folder the session was started in. An import that points outside it needs a one-time approval for the project, and stays off if you decline. The block lives at the repo root and points into wherever AppShell is installed, so:

- **Started at the repo root:** the guide loads.
- **Started inside the frontend package:** Claude Code also reads the `AGENTS.md` files above the folder it starts in, so it still sees the root block. With pnpm the guide loads, because pnpm links AppShell into the package's own `node_modules`. With npm, Yarn or Bun workspaces AppShell is usually hoisted to the root `node_modules`, which is outside the package, so the import needs the approval.
- **Started in another folder**, such as a backend package next to the frontend: the guide is outside that folder, so the import needs the approval.

Where the import isn't followed, the rest of the block still loads, including the path to the guide, so the agent can open it when it follows the instruction to read it.

Some tools only read the `AGENTS.md` nearest to the folder they work in. If the frontend package has its own `AGENTS.md`, `init` points this out. Run it with `--target .` from the package to put the block in that file, so tools that stop at the nearest file still see it. `init` doesn't remove a block it wrote to another file earlier, so delete the one you no longer want.

## Keeping it current

Upgrading AppShell updates the guide and the docs with it, so most upgrades leave the block alone. To pick up the ones that don't, run this from the same package after you upgrade:

```bash
pnpm exec app-shell agents sync
```

`sync` rewrites only what's between the markers, and only when the content changed, so it's safe to run after every upgrade. It does nothing if the block isn't there, and never creates the file.

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
pnpm exec app-shell agents init --target .
```

That puts the block in the package's own `AGENTS.md`. The path is relative to the package you run it from, and a folder means the `AGENTS.md` in it. A file path works too, such as `--target ../../CLAUDE.md` for a repo that keeps its agent instructions in `CLAUDE.md` only.

Pass the same `--target` to `sync`. With `--add-prepare`, `init` writes it into the `prepare` script for you. Paths inside the block are relative to the directory of the file it lives in.

## Limits

- **Yarn Plug'n'Play isn't supported.** It keeps packages in zip files, so there is no docs folder on disk for the block to point at. Use a `node_modules` install.
- **Hoisting can move the path.** With npm, Yarn or Bun workspaces, the package manager decides where AppShell lands, and that can change when another package's dependencies change. Run `sync` if the block's path stops matching. pnpm always links it into the package's own `node_modules`.

## Skills

The `app-shell-patterns` skill in the package's `skills/` folder reads the same docs. It no longer carries its own copy: it finds the docs folder from the block in `AGENTS.md`, or by looking in `node_modules`, so the skill and the block always agree on the installed version. Its `references/` folder only holds short pointers, so a copy of an older skill in your repo, or an old link, sends the agent to the right place.

## Opting out

Delete the block, markers included. `sync` does nothing when it can't find its markers and never creates the file, so a leftover `prepare` line is harmless. Remove it too if you want a clean `package.json`.
