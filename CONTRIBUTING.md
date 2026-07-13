# Contributing to Tailor Platform AppShell

Thanks for contributing! AppShell is an opinionated React framework for building ERP
applications on Tailor Platform. This guide describes the **end-to-end development
workflow** — from picking up an issue to a published release — and how it relates to
`CLAUDE.md`.

**`CLAUDE.md` vs. this file:** `CLAUDE.md` is the terse orientation doc auto-loaded by coding
agents (architecture map, where things live). This file is the human-facing walkthrough of
_how a contribution flows through the repo_ — `CLAUDE.md` links here for that.

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
  ├─ 3. Develop ................... .agents/skills/add-component, packages/core/skills/app-shell-patterns
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

- Node and pnpm versions are pinned in `package.json` (`engines` / `packageManager`) — use
  `corepack enable` to pick them up automatically.
- This is a **pnpm + turbo monorepo**.

```bash
pnpm install     # also installs git hooks via the `prepare` → lefthook script
pnpm dev         # turbo watch on examples/* → example app at http://localhost:3000
```

### Repository layout

| Path                   | What it is                                                                        |
| ---------------------- | --------------------------------------------------------------------------------- |
| `packages/core`        | `@tailor-platform/app-shell` — the published library (components, hooks, layouts) |
| `packages/vite-plugin` | `@tailor-platform/app-shell-vite-plugin` — file-based routing                     |
| `packages/sdk-plugin`  | Tailor SDK plugin                                                                 |
| `examples/`            | `vite-app` and `nextjs-app` reference integrations (what `pnpm dev` runs)         |
| `e2e/`                 | Playwright suite + a real Tailor backend definition                               |
| `catalogue/`           | Component catalogue                                                               |
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

- **Adding or changing a UI component** → `.agents/skills/add-component/SKILL.md` (component
  patterns, styling conventions, public API rules, test expectations).
- **Building pages / picking UI patterns** → `packages/core/skills/app-shell-patterns/`. This
  skill is **shipped inside the npm package** (`files: ["dist/**", "skills/**"]`), so
  downstream consumers' agents rely on it directly. If you change a component's API, design
  tokens, or add/alter a pattern, update this skill too — otherwise consumer guidance drifts
  out of sync.

---

## 5. Run quality checks locally

Use the **`quality-check`** skill (`.agents/skills/quality-check/SKILL.md`) for the exact
commands and order — it's the source of truth for what "clean" means and stays current as
tooling changes.

For `packages/**` changes, also consider running the API Design Review locally before pushing
— see `.agents/skills/api-design-review/` (Claude Code/CLI agents) or
`.github/prompts/api-design-review.prompt.md` (Copilot).

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

- **`.agents/skills/`** — contributor procedures (add-component, quality-check,
  create-changeset, api-design-review).
- **`packages/core/skills/`** — patterns shipped to consumers (app-shell-patterns).
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
