# Contributing to Tailor Platform AppShell

Thanks for contributing! AppShell is an opinionated React framework for building ERP
applications on Tailor Platform. This guide is the **end-to-end development workflow** — from
picking up an issue to a published release.

It's the human-facing walkthrough of _how a contribution flows through the repo_. Its
companion, [`CLAUDE.md`](./CLAUDE.md), is the terse orientation doc auto-loaded by coding
agents (the architecture map — where things live in the code); it links here for the workflow.

## The core idea: one source of truth, many executors

This repo codifies its conventions **once** — as **skills** and **agents** under
`.agents/skills/` and `.github/` — and runs those same conventions through every actor that
touches the code (you, Claude Code, Copilot, and the gh-aw bots). **When a convention changes,
change the skill/agent — not just the code**, and not this document: rules, commands, and
trigger mechanics live in exactly one place (the skill or workflow file), and this guide only
points at them. That keeps this file from drifting out of sync with what actually runs.

---

## TL;DR — the lifecycle

```
  ┌─ 1. Find/file an issue ........ project board (tailor-inc #15)
  │
  ├─ 2. Branch from main
  │
  ├─ 3. Develop ................... .agents/skills/code-review, catalogue/ (app-shell-patterns source)
  │
  ├─ 4. Quality-check locally ..... .agents/skills/quality-check
  │
  ├─ 5. Add a changeset ........... .agents/skills/create-changeset  (user-facing changes only)
  │
  ├─ 6. Open a PR ................. CI runs automatically; comment `/review` for the API Design Review bot
  │
  ├─ 7. Address review → merge .... resolve High/Medium findings; CI green
  │
  └─ 8. After merge (automated) ... docs-update bot + release workflow (see .github/workflows/)
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

| Path                   | What it is                                                                        |
| ---------------------- | --------------------------------------------------------------------------------- |
| `packages/core`        | `@tailor-platform/app-shell` — the published library (components, hooks, layouts) |
| `packages/vite-plugin` | `@tailor-platform/vite-plugin-app-shell` — file-based routing                     |
| `packages/sdk-plugin`  | Tailor SDK plugin                                                                 |
| `examples/`            | `vite-app` and `nextjs-app` reference integrations (what `pnpm dev` runs)         |
| `e2e/`                 | Playwright suite + a real Tailor backend definition                               |
| `catalogue/`           | Pattern catalogue — source for the generated `app-shell-patterns` skill           |
| `docs/`                | User-facing documentation (kept in sync by the docs-update bot)                   |
| `.agents/skills/`      | **Contributor procedures** — the source of truth for how to do the work           |
| `.github/`             | Agents, prompts, and workflows (CI + agentic bots)                                |

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
  **generated** from the `catalogue/` package (`catalogue/src/**` is the source) into
  `packages/core/skills/app-shell-patterns/`, which is gitignored and shipped to consumers via
  the npm package. **Edit the source in `catalogue/` and regenerate with `pnpm build`** (see
  [`catalogue/README.md`](./catalogue/README.md)) — never hand-edit the generated skill. CI's
  `check-generated-skills` test fails if the two drift, so if you change a public API,
  design tokens, or a pattern, update the catalogue source too.

---

## 5. Run quality checks locally

Use the **`quality-check`** skill (`.agents/skills/quality-check/SKILL.md`) for the exact
commands and order — it's the source of truth for what "clean" means and stays current as
tooling changes.

For `packages/**` changes, use `.agents/skills/code-review/SKILL.md` for review guidance locally.
You can also use `.github/prompts/api-design-review.prompt.md` in Copilot-style flows.

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
license checks) and, on comment, the agentic API Design Review. **Exact triggers, paths, and
labels live in `.github/workflows/` and change over time — check those files rather than
trusting a copy here.**

Commenting **`/review`** on a PR runs the **API Design Review** bot
(`.github/agents/api-design-reviewer.md` + `.github/agents/impact-analyzer.md`): it classifies
changed `packages/**` files as public/internal, reviews only changed public code, and posts a
severity-sorted verdict. It's multi-round aware — re-runs won't re-flag resolved findings.

---

## 8. Review, merge, and what happens after

- Address the `/review` bot's **High/Medium** findings until it returns **Approve**; ensure all
  CI checks are green. Low-severity suggestions are non-blocking.
- After merge to `main`, automation takes over: a **Documentation Updater** bot opens a
  `[docs-update]` PR from pending changesets, and the **Release** workflow opens/updates a
  "Version Packages" PR that publishes to NPM when merged. See `.github/workflows/` for the
  exact triggers.

So a normal feature lands as **two or three PRs**: your change, an automatic `[docs-update]`
PR, and eventually inclusion in a "Version Packages" release PR.

---

## Reference

Rather than duplicate file-by-file details here (they go stale — see `.agents/skills/**` and
`.github/workflows/*.yaml` for what's actually authoritative), these are the places to look:

- **`.agents/skills/`** — contributor procedures, primarily `code-review`, `quality-check`, and
  `create-changeset`.
- **`catalogue/`** — source for the `app-shell-patterns` skill shipped to consumers; generated
  into `packages/core/skills/` (gitignored) via `pnpm build`.
- **`.github/agents/`** and **`.github/prompts/`** — reviewer personas and IDE-agent prompts.
- **`.github/workflows/`** — CI and gh-aw agentic workflows (source `.md` files are compiled to
  `*.lock.yml` via `gh aw compile`; never hand-edit `*.lock.yml`).
- **`CLAUDE.md`** — architecture orientation for coding agents.
- **`README.md`** — quickstart and development commands.

### Tooling & conventions

- **turbo** orchestrates tasks (`build`, `dev`, `type-check`, `lint`, `test`, `fmt`).
- **oxfmt** (format) + **oxlint** (lint), versions pinned via the pnpm **catalog** in
  `pnpm-workspace.yaml`. **lefthook** runs `oxfmt` on staged files pre-commit.
- **changesets** drives versioning and publishing.
- **Supply-chain hygiene**: GitHub Actions are **pinned by commit SHA**. pnpm enforces
  `minimumReleaseAge`, exotic-subdep blocking, and lockfile trust (`pnpm-workspace.yaml`). When
  adding a dependency or editing a workflow, preserve these (pin SHAs; commit `pnpm-lock.yaml`).
