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

It does three things:

- Adds the block to `AGENTS.md` at the repo root, creating the file if there isn't one.
- Adds `app-shell agents sync` to that package's `prepare` script. An existing `prepare` is kept and the command is chained after it with `&&`.
- Warns if the repo has a `CLAUDE.md` that doesn't import `@AGENTS.md`. Claude Code ignores `AGENTS.md` in that case, so add a line with `@AGENTS.md` to it.

Commit the `AGENTS.md` and `package.json` changes.

## What the block contains

- The path to the docs, written once: `<your package>/node_modules/@tailor-platform/app-shell/docs/`.
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

## How it stays current

`app-shell agents sync` runs from `prepare`, so it runs when `pnpm install` installs something. If the docs index changed with the new version, `AGENTS.md` shows up as a diff to commit.

`sync` is deliberately quiet. It only writes when the block's content changed, it does nothing when `CI` is set, and it always exits 0, so it can't fail an install.

Two cases don't refresh the block:

- `pnpm add @tailor-platform/app-shell@x` doesn't run `prepare`.
- Renovate and Dependabot PRs don't run scripts.

In both, the block is refreshed by the next install on someone's machine. Until then it can be missing a new doc or list a renamed one.

## Writing to a different file

By default the block goes in `AGENTS.md` at the repo root, found by walking up from the package to the directory that holds `.git` (or `pnpm-workspace.yaml` when there is no `.git`). Pass `--target` to put it somewhere else:

```bash
pnpm exec app-shell agents init --target ../../docs/AGENTS.md
```

The path is relative to the package you run it from. `init` writes the same `--target` into the `prepare` script, so `sync` refreshes the same file. Paths inside the block are relative to the directory of the file it lives in.

## Opting out

Delete the block, markers included. `sync` does nothing when it can't find its markers and never creates the file, so the leftover `prepare` line is harmless. Remove it too if you want a clean `package.json`.
