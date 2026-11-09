# Contributing to Tailor Platform AppShell

Thanks for contributing! AppShell is an opinionated React framework for building ERP
applications on Tailor Platform. This guide is the **end-to-end development workflow** — from
picking up an issue to a published release.

It's the human-facing walkthrough of _how a contribution flows through the repo_. Its
companion, [`CLAUDE.md`](./CLAUDE.md), is the terse orientation doc auto-loaded by coding
agents (the architecture map — where things live in the code); it links here for the workflow.

## The core idea: one source of truth, many executors

This repo codifies its conventions **once** — as **skills** under `.agents/skills/` — and
runs those same conventions through every actor that touches the code (you, Claude Code,
and Copilot). **When a convention changes, change the skill — not just the code**, and not
this document: rules, commands, and trigger mechanics live in exactly one place (the skill
or workflow file), and this guide only points at them. That keeps this file from drifting
out of sync with what actually runs.

---

## TL;DR — the lifecycle

```
  ┌─ 1. Find/file an issue ........ project board (tailor-inc #15)
  │
  ├─ 2. Branch from main
  │
  ├─ 3. Develop ................... .agents/skills/code-review, docs-src/ (docs + skill source)
  │
  ├─ 4. Quality-check locally ..... .agents/skills/quality-check
  │
  ├─ 5. Add a changeset ........... .agents/skills/create-changeset  (user-facing changes only)
  │
  ├─ 6. Open a PR ................. CI runs automatically; request a code review
  │
  ├─ 7. Address review → merge .... address review findings; CI green
  │
  └─ 8. After merge (automated) ... release workflow (see .github/workflows/)
```

---

## 1. Prerequisites & setup

This is a **pnpm + turbo monorepo**.

- **Node.js 24** is required (see `engines` in `package.json`). `engine-strict` is enabled, so
  `pnpm install` refuses to run on an unsupported version — the plugin packages build with
  `tsdown`, whose config loader relies on Node 24's native TypeScript stripping and otherwise
  fails cryptically. If you use [nvm](https://github.com/nvm-sh/nvm), run `nvm use` (a `.nvmrc`
  is provided).
- **pnpm** is pinned via `packageManager` in `package.json` — run `corepack enable` to pick up
  the right version automatically.

```bash
pnpm install     # also wires up git hooks via the `prepare` → lefthook script
pnpm dev         # turbo watch on examples/* → example app at http://localhost:3000
```

Other common commands: `pnpm build` (production build), plus the quality checks in §5. This
repo publishes via changesets (§6) — you won't run `changeset:publish` by hand; CI does.

### Repository layout

| Path                   | What it is                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| `packages/core`        | `@tailor-platform/app-shell` — the published library (components, hooks, layouts)                 |
| `packages/vite-plugin` | `@tailor-platform/vite-plugin-app-shell` — file-based routing                                     |
| `packages/sdk-plugin`  | `@tailor-platform/sdk-plugin-app-shell` — Tailor SDK plugin                                       |
| `examples/`            | `vite-app` reference app and consolidated showcase (what `pnpm dev` runs)                         |
| `e2e/`                 | Playwright suite + a real Tailor backend definition                                               |
| `docs-src/`            | Authored doc sources — outlines (incl. `guides/`) + runnable examples (the only hand-edited docs) |
| `docs/`                | **Generated** user-facing documentation — never hand-edited (`pnpm docs:sync`)                    |
| `docs-browser/`        | AppShell app that renders `docs/` with live examples                                              |
| `.agents/skills/`      | **Contributor procedures** — the source of truth for how to do the work                           |
| `.github/`             | CI workflows and repository configuration                                                         |

---

## 2. Find or file an issue

Work starts from the team's GitHub **project board** (`tailor-inc`, project **#15**), where each
ticket carries a **Component** field (e.g. `Button`, `Sidebar`, `Routing`, `CommandPalette`).

- Search the board for an existing/duplicate ticket before filing a new one. If none exists,
  draft a new ticket with the Component field set to the affected area (e.g. `app-shell`).
- If you use Claude Code, personal skills for searching/creating board tickets (e.g.
  `find-or-create-board-issue`) are a convenience some contributors have installed locally —
  they aren't checked into this repo, so don't assume every contributor has them.

---

## 3. Branch & commit conventions

- **Branch from `main`** (the changesets base branch).
- **Commits and PR titles follow [Conventional Commits]** — this is the observed convention in
  history, e.g. `fix(button,badge): …`, `docs(button): …`, `ci(agentic-workflows): …`.
  The scope is usually the component or area.

[Conventional Commits]: https://www.conventionalcommits.org/

---

## 4. Develop using the project's skills

Conventions are encoded as skills under **`.agents/skills/`**. Read the relevant `SKILL.md`
(or let your coding agent auto-load it) — these are the **authoritative** procedures, so
this guide won't restate their rules (they'd only go stale here).

- **Changing implementation under `packages/**`** → `.agents/skills/code-review/SKILL.md` (the code review skill routes you to the shared cross-cutting and area references for the change).
- **Building pages / picking UI patterns** → the **`app-shell-patterns`** skill. It is
  **generated** by `docs-kit` from `docs-src/` into `packages/core/skills/app-shell-patterns/`,
  which is gitignored and shipped to consumers via the npm package. **Edit the source under
  `docs-src/` and regenerate with `pnpm docs:sync`** — never hand-edit the generated skill.
  `pnpm docs:check` blocks in CI if the two drift, so if you change a public API, design tokens,
  or a pattern, update the `docs-src/` source too.
- **Changing documentation** → `.agents/skills/resync-docs/SKILL.md`. Everything under `docs/` is
  generated; edit the `*.docs.outline.md` (prose) and `*.docs.examples.tsx` (runnable examples)
  under `docs-src/`, then run `pnpm docs:sync`. Outline frontmatter is a closed schema — see
  [`decisions/documentation-management-overhaul.md`](./decisions/documentation-management-overhaul.md).

---

## 5. Run quality checks locally

Use the **`quality-check`** skill (`.agents/skills/quality-check/SKILL.md`) for the exact
commands and order — it's the source of truth for what "clean" means and stays current as
tooling changes.

For `packages/**` changes, use `.agents/skills/code-review/SKILL.md` for review guidance locally.

---

## 6. Add a changeset

This repo versions and publishes `@tailor-platform/app-shell` with [changesets]. Use the
**`create-changeset`** skill (`.agents/skills/create-changeset/SKILL.md`) for bump-type
guidance and file format — or just run `pnpm changeset:create`.

**Add one when** the change is user-facing: new component/hook/util, behavior-changing bug fix,
API change, breaking change, perf improvement, or docs that affect API usage. **Skip** it for
internal-only refactors, dev/build tooling, test-only, and formatting changes.

> Dependabot PRs (label `dependencies`) get a changeset added automatically — you don't write
> one by hand.

[changesets]: https://github.com/changesets/changesets

---

## 7. Open a PR — what runs automatically

Opening a PR triggers CI (format/lint/test/type-check, e2e where relevant, doc link-checking,
license checks). **Exact triggers, paths, and labels live in `.github/workflows/` and change
over time — check those files rather than trusting a copy here.**

---

## 8. Review, merge, and what happens after

- Address review findings and obtain approval; ensure all CI checks are green.
- Include required documentation updates in the same PR as the code change (see §4).
  CI checks for documentation drift before merge.
- After merge to `main`, the **Release** workflow opens/updates a "Version Packages" PR
  that publishes to NPM when merged. See `.github/workflows/` for the exact triggers.

---

## Reference

Rather than duplicate file-by-file details here (they go stale — see `.agents/skills/**` and
`.github/workflows/*.yaml` for what's actually authoritative), these are the places to look:

- **`.agents/skills/`** — contributor procedures, primarily `code-review`, `quality-check`, and
  `create-changeset`.
- **`docs-src/`** — authored source for `docs/` and for the `app-shell-patterns` skill shipped to
  consumers; both generated via `pnpm docs:sync` (the skill into `packages/core/skills/`,
  gitignored).
- **`.github/workflows/`** — CI and release workflows.
- **`CLAUDE.md`** — architecture orientation for coding agents.
- **`README.md`** — quickstart and development commands.

### Tooling & conventions

- **turbo** orchestrates tasks (`build`, `dev`, `type-check`, `lint`, `test`, `fmt`).
- **oxfmt** (format) + **oxlint** (lint), versions pinned via the pnpm **catalog** in
  `pnpm-workspace.yaml`. **lefthook** runs `oxfmt` on staged files pre-commit.
- **changesets** drives versioning and publishing.
- **File naming**: files and directories under `packages/core/src/components/` are kebab-case
  (`date-field/date-field.tsx`); component identifiers stay PascalCase. See
  [component-design.md](./.agents/references/component-design.md#file-naming).
- **Supply-chain hygiene**: GitHub Actions are **pinned by commit SHA**. pnpm enforces
  `minimumReleaseAge`, exotic-subdep blocking, and lockfile trust (`pnpm-workspace.yaml`). When
  adding a dependency or editing a workflow, preserve these (pin SHAs; commit `pnpm-lock.yaml`).
