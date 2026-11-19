---
kind: prose
group: coding-agents
title: Coding Agents
description: Add an always-loaded AppShell block to your repo's AGENTS.md so coding agents know the docs and the rules from the start of a session
---

# Coding Agents

AppShell ships its docs inside the package, so they always match the version you have installed. The `app-shell` CLI adds a small block to your repo's `AGENTS.md` that tells coding agents where those docs are and lists the few rules lint can't check.

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

- The path to the docs, written once: `<your package>/node_modules/@tailor-platform/app-shell/dist/docs/`.
- An index of those docs by category (pages, patterns, components, hooks and functions, concepts). Entries are slugs relative to the docs path.
- A short list of rules, such as one primary action per view and forms going through `Form` and `Field`.

It has no version number, so it only changes when a doc is added, renamed or removed, or when the rules change.

The block sits between two HTML comment markers that carry the package path:

```md
<!-- app-shell:agents:start apps/web -->

…

<!-- app-shell:agents:end apps/web -->
```

A repo with two frontends gets two blocks, and each package only rewrites its own. Anything you write outside the markers is left alone. Anything inside them is overwritten on the next refresh.

## Keeping it current

The block can go stale when you upgrade AppShell and the docs change. Refresh it by running this from the same package:

```bash
pnpm exec app-shell agents sync
```

`sync` rewrites only what's between the markers, and only when the content changed. It does nothing if the block isn't there, and never creates the file.

### Refreshing on install (`--add-prepare`)

To have this happen on its own, pass `--add-prepare` to `init`:

```bash
pnpm exec app-shell agents init --add-prepare
```

This adds `app-shell agents sync` to the package's `prepare` script, chaining it after an existing one with `&&`. `sync` then runs whenever `pnpm install` installs something, and the block is refreshed as part of the upgrade.

The trade-offs:

- **Pros:** nobody has to remember to run `sync`, so the index stays in step with the installed docs.
- **Cons:** it changes your `package.json`, and an `AGENTS.md` diff can show up after any install that changes dependencies, including in PRs that aren't about AppShell.
- **Not covered:** `pnpm add @tailor-platform/app-shell@x` doesn't run `prepare`, and Renovate and Dependabot PRs don't run scripts. The block is refreshed by the next install on someone's machine.

`sync` is kept quiet so it's safe in `prepare`: it does nothing when `CI` is set, and it always exits 0, so it can't fail an install.

## Writing to a different file

By default the block goes in `AGENTS.md` at the repo root, found by walking up from the package to the directory that holds `.git` (or `pnpm-workspace.yaml` when there is no `.git`). Pass `--target` to put it somewhere else:

```bash
pnpm exec app-shell agents init --target ../../docs/AGENTS.md
```

The path is relative to the package you run it from. Pass the same `--target` to `sync`. With `--add-prepare`, `init` writes it into the `prepare` script for you. Paths inside the block are relative to the directory of the file it lives in.

## Opting out

Delete the block, markers included. `sync` does nothing when it can't find its markers and never creates the file, so a leftover `prepare` line is harmless. Remove it too if you want a clean `package.json`.
