# Contributing to Tailor Platform AppShell

Thanks for contributing! AppShell is an opinionated React framework for building ERP
applications on Tailor Platform. This guide describes the **intended end-to-end development
workflow** — from picking up an issue to a published release.

## The core idea: one source of truth, many executors

This repo codifies its conventions **once** — as **skills** and **agents** — and then runs
those same conventions through every actor that touches the code:

| Actor                        | How it uses the conventions                                                |
| ---------------------------- | -------------------------------------------------------------------------- |
| **You (human)**              | Read the skill in `.agents/skills/**` and follow the procedure             |
| **Claude Code / CLI agents** | Auto-load the matching skill (see `CLAUDE.md`) and follow it for you       |
| **IDE assistants (Copilot)** | Use `.github/prompts/*.prompt.md` and the env in `copilot-setup-steps.yml` |
| **GitHub bots (gh-aw)**      | Run `.github/workflows/*.md` agentic workflows on PRs and on `main`        |

The practical upshot: **when a convention changes, change the skill/agent — not just the
code.** The API-review bot literally reviews against the rules in the `add-component` skill,
and the docs bot documents against `packages/core/src/index.ts`. Keeping those sources
accurate keeps every executor accurate.

---

## TL;DR — the lifecycle

```
  ┌─ 1. Find/file an issue ........ project board (tailor-inc #15)
  │
  ├─ 2. Branch from main
  │
  ├─ 3. Develop ................... add-component skill + app-shell-patterns (house rules)
  │
  ├─ 4. Quality-check locally ..... quality-check skill: type-check · lint · test · fmt
  │                                 (lefthook auto-formats on commit)
  │
  ├─ 5. Add a changeset ........... create-changeset skill  (user-facing changes only)
  │
  ├─ 6. Open a PR ................. CI: ci-packages · ci-e2e · doc-check
  │                                 Bot: comment `/review` → API Design Review
  │                                 Labels: `preview` (pkg-pr-new) · `dependencies` (auto-changeset)
  │
  ├─ 7. Address review → merge .... resolve High/Medium findings; CI green
  │
  └─ 8. After merge (automated) ... docs-update bot → [docs-update] PR
                                    release workflow → "Version Packages" PR → NPM
```

---

## 1. Prerequisites & setup

- **Node `24.x`** and **pnpm `11.5.0`** (pinned in `package.json`; use `corepack enable`).
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
| `.agents/skills/`      | **Contributor procedures** (the source of truth — see §3, §4, §5)                 |
| `.github/`             | Agents, prompts, and workflows (CI + agentic bots — see §6, §8)                   |

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
(or let your coding agent auto-load it) — these are the **authoritative** procedures.

### Adding or changing a UI component → `add-component` skill

`.agents/skills/add-component/SKILL.md` is the full procedure. The house rules it enforces:

- **Pick a pattern**: Simple single-file (A), Compound namespace object (B), Multi-file
  directory (C), or Standalone + Parts (D).
- **Styling**: every Tailwind class uses the **`astw:`** prefix; merge with **`cn()`** from
  `@/lib/utils`; set **`data-slot="…"`** on roots. No `<style>`/CSS-in-JS, no `@source`, no
  component-specific `globals.css`.
- **Framework-agnostic**: no `"use client"` unless strictly required (must work in Next.js,
  Vite, Remix).
- **Wrapping [Base UI]**: `Pick<>` only the stable props on Root/Provider components; use
  `React.ComponentProps<>` for leaf sub-components; namespace props when compositing multiple
  primitives; set `displayName` on every sub-component.
- **Minimal public API**: export only the component + its primary `Props` type from
  `packages/core/src/index.ts`. Never export internal types, guards, or enums — consumers
  infer them via TypeScript.
- **Tests**: a `*.test.tsx` next to the component (Vitest + Testing Library) with **snapshot**
  tests for variants/states and **behavioral** tests for interactions.

[Base UI]: https://base-ui.com/llms.txt

### Building pages / picking UI patterns → `app-shell-patterns` skill

`packages/core/skills/app-shell-patterns/` is a catalog of page patterns (list, detail, form,
interaction) plus fundamental references (components, design-system, GraphQL). **This skill is
shipped inside the npm package** (`files: ["dist/**", "skills/**"]`), so downstream consumers'
agents rely on it. **If you change a component's API, design tokens, or add/alter a pattern,
update this skill too** — otherwise consumer guidance drifts out of sync.

---

## 5. Run quality checks locally

Use the **`quality-check`** skill (`.agents/skills/quality-check/SKILL.md`) — run these in
order, fixing and re-running until clean (format **last**, so fixes get formatted):

```bash
pnpm type-check   # turbo → tsc across packages
pnpm lint         # turbo → oxlint
pnpm test         # turbo → vitest (core: `cd packages/core && pnpm test`)
pnpm fmt          # oxfmt (write)   — use `pnpm fmt:check` to verify only
```

- A **lefthook** `pre-commit` hook runs `oxfmt` on staged files and re-stages the fixes, so
  formatting rarely fails CI — but `ci-packages` runs `pnpm fmt:check` across the **whole repo**
  and will fail on any unformatted file.
- **Optional, recommended for `packages/**` changes**: run the API Design Reviewer **locally**
before pushing — via the **`api-design-review`** skill (`.agents/skills/api-design-review/`)
for Claude Code/CLI agents, or the `.github/prompts/api-design-review.prompt.md` prompt for
  Copilot. Both review the current branch's diff against the same principles the CI bot uses.
- **E2E** (`pnpm --filter e2e test:e2e`, Playwright) runs in CI against a live Tailor backend.
  Running it locally requires backend env vars (`VITE_TAILOR_APP_URL`, `VITE_TAILOR_CLIENT_ID`,
  `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`) and a deployed backend (`pnpm --filter e2e deploy:backend`).

---

## 6. Add a changeset

This repo versions and publishes `@tailor-platform/app-shell` with [changesets]. Use the
**`create-changeset`** skill or `pnpm changeset:create`.

**Add one when** the change is user-facing: new component/hook/util, behavior-changing bug fix,
API change, breaking change, perf improvement, or docs that affect API usage. A dependency bump
that affects consumers gets at least a **patch**.

**Skip** for internal-only refactors, dev/build tooling, test-only, and formatting changes.

Bump types: **patch** (fixes), **minor** (new backward-compatible API), **major** (breaking).
File format:

```markdown
---
"@tailor-platform/app-shell": minor
---

One- to three-line, end-user-facing summary. Include a minimal usage example for new APIs,
or a before/after migration snippet for breaking changes.
```

> Dependabot PRs (label `dependencies`) get a changeset added automatically by the
> **Add Changeset to Dependabot PRs** workflow — you don't write one by hand.

[changesets]: https://github.com/changesets/changesets

---

## 7. Open a PR — what runs automatically

### Continuous integration (always-on, path-filtered)

| Workflow           | Trigger                                                                                   | What it does                                                      |
| ------------------ | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **CI (packages)**  | push touching `packages/**`, `examples/**`, `docs/**`, `catalogue/**`, lockfile/manifests | `pnpm install` → `fmt:check` → `turbo run lint test type-check`   |
| **CI (e2e)**       | push touching `packages/core/**` or `e2e/**`                                              | Build, lint/type-check e2e, run Playwright against a live backend |
| **Doc Check**      | PR touching `docs/**/*.md`                                                                | Link-checks docs with lychee (fails on broken links)              |
| **Check Licenses** | push/PR touching `pnpm-lock.yaml` or `.github/license-package-exceptions.json`            | Fails if a new dependency's license isn't allow-listed            |

### The agentic reviewer — comment `/review`

Commenting **`/review`** on a PR triggers the **API Design Review** bot (a gh-aw agentic
workflow built from `.github/agents/api-design-reviewer.md`):

1. It first runs the **Impact Analyzer** sub-agent to classify each changed `packages/**` file
   as **public** (exported from `index.ts`) or **internal**, and to trace usage sites.
2. It reviews **only changed, public** code for API consistency and footguns, posts up to **10
   inline review comments** sorted by severity (High → Medium → Low), and ends with a
   **Verdict: Approve | Request Changes**.
3. It is **multi-round aware**: on re-runs it verifies prior findings were addressed and won't
   re-flag resolved issues or block solely on Low-severity nits.

### Optional labels

| Label          | Effect                                                                                                                                                                             |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `preview`      | **Release preview** publishes a throwaway build via [pkg.pr.new]; the bot comments an installable `pnpm add` URL (pinned to the commit SHA) so reviewers can try it in a real app. |
| `dependencies` | (Dependabot) auto-adds a changeset.                                                                                                                                                |

[pkg.pr.new]: https://pkg.pr.new

---

## 8. Review, merge, and what happens after

- Address the `/review` bot's **High/Medium** findings until it returns **Approve**; ensure all
  CI checks are green. Low-severity suggestions are non-blocking.
- After merge to `main`, two automations take over:

| Automation                | Trigger                                   | Result                                                                                                                                                                                        |
| ------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Documentation Updater** | push to `main` changing `.changeset/*.md` | Reads pending changesets, updates `docs/` to match the public API, opens a **`[docs-update]`** PR (which itself goes through CI). Skips dependency/internal-only changesets.                  |
| **Release**               | push to `main`                            | The changesets action opens/updates a **"Version Packages"** PR that aggregates changesets + CHANGELOGs. **Merging that PR** builds and publishes to NPM and deletes the consumed changesets. |

So a normal feature lands as **two or three PRs**: your change, an automatic `[docs-update]`
PR, and eventually inclusion in a "Version Packages" release PR.

---

## Reference

### Skills

| Skill                | Location                                           | Use when…                                          |
| -------------------- | -------------------------------------------------- | -------------------------------------------------- |
| `add-component`      | `.agents/skills/add-component/`                    | Adding/wrapping a UI component for `packages/core` |
| `create-changeset`   | `.agents/skills/create-changeset/`                 | Recording a user-facing change for release         |
| `quality-check`      | `.agents/skills/quality-check/`                    | Validating type-check / lint / test / format       |
| `api-design-review`  | `.agents/skills/api-design-review/`                | Running the API Design Review locally before push  |
| `app-shell-patterns` | `packages/core/skills/` (**shipped to consumers**) | Choosing/implementing a page pattern; keep in sync |

### Agents & prompts

| File                                          | Role                                                                   |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| `.github/agents/api-design-reviewer.md`       | Reviewer persona — API consistency & footguns in `packages/**`         |
| `.github/agents/impact-analyzer.md`           | Sub-agent — classifies public/internal changes and traces usage        |
| `.github/prompts/api-design-review.prompt.md` | Run the reviewer **locally** against the current branch before pushing |

### Agentic workflows (gh-aw)

These are authored in Markdown and **compiled** to `*.lock.yml`:

| Source (`.github/workflows/`) | Trigger                                   | Output                                   |
| ----------------------------- | ----------------------------------------- | ---------------------------------------- |
| `api-design-review.md`        | `/review` comment on a PR                 | Inline review comments + verdict         |
| `docs-update.md`              | push to `main` changing `.changeset/*.md` | `[docs-update]` PR                       |
| `agentics-maintenance.yml`    | daily cron + manual dispatch              | Maintains the gh-aw system (admin-gated) |

> **Editing an agentic workflow:** change the `.md` source (and any imported agent), then run
> `gh aw compile` to regenerate the `.lock.yml`. **Never hand-edit `*.lock.yml`** — it is
> machine-generated (the header says so) and your edits will be overwritten.

### CI/CD workflows

| File                        | Purpose                                                   |
| --------------------------- | --------------------------------------------------------- |
| `ci-packages.yaml`          | Format-check, lint, test, type-check (via `actions/ci`)   |
| `ci-e2e.yaml`               | Playwright e2e against a live backend                     |
| `doc-check.yaml`            | Link-check docs                                           |
| `dependabot-changeset.yaml` | Auto-changeset for `dependencies` PRs                     |
| `pkg-pr-new.yaml`           | Preview package publish for `preview` PRs                 |
| `release.yaml`              | Changesets release PR + NPM publish                       |
| `check-licenses.yaml`       | Fails on disallowed dependency licenses                   |
| `copilot-setup-steps.yml`   | Environment bootstrap for the GitHub Copilot coding agent |
| `actions/ci/action.yaml`    | Shared composite action used by `ci-packages`             |

### Tooling & conventions

- **turbo** orchestrates tasks (`build`, `dev`, `type-check`, `lint`, `test`, `fmt`); most tasks
  `dependsOn: ["^build"]`.
- **oxfmt** (format) + **oxlint** (lint), versions pinned via the pnpm **catalog** in
  `pnpm-workspace.yaml`.
- **lefthook** runs `oxfmt` on staged files pre-commit.
- **changesets** drives versioning and publishing.
- **Supply-chain hygiene**: GitHub Actions are **pinned by commit SHA** (tracked in
  `.github/aw/actions-lock.json` for gh-aw). pnpm enforces `minimumReleaseAge`, exotic-subdep
  blocking, and lockfile trust (`pnpm-workspace.yaml`). When adding a dependency or editing a
  workflow, preserve these (pin SHAs; commit `pnpm-lock.yaml`).

---

_This document is a draft describing the intended workflow as encoded in the repo's skills,
agents, and workflows. Please refine wording and fill any team-specific gaps (e.g. code of
conduct, CLA, support channels) before publishing._
