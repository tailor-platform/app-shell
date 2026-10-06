# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**📋 For the end-to-end contribution workflow (issue → branch → develop → PR → release), see:** [CONTRIBUTING.md](./CONTRIBUTING.md)

## Project Overview

Tailor Platform AppShell - A React-based framework for building ERP applications with opinionated layouts and authentication.

**📖 For complete overview and quickstart guide, see:** [README.md](./README.md)

## Commands

**📋 For development commands and setup, see:** [CONTRIBUTING.md](./CONTRIBUTING.md)

## Documentation

Everything under [`docs/`](./docs/) is **generated** by the `docs-kit` pipeline and must **never be
hand-edited** — the pre-commit hook warns and `pnpm docs:check` in CI blocks on any hand edit,
drift, or file created under `docs/` with no source. See [decisions/documentation-management-overhaul.md](./decisions/documentation-management-overhaul.md)
and the [`resync-docs`](./.agents/skills/resync-docs/SKILL.md) skill.

To change or add a doc, edit the authored **source** under `docs-src/`, then run `pnpm docs:sync`:

| To document…                                  | Edit (authored source)                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| a component / hook / pattern / page / concept | `docs-src/<kind>/<slug>.docs.outline.md` (prose) + optional `<slug>.docs.examples.tsx` (runnable example)     |
| the consumer `app-shell-patterns` skill       | `skills/app-shell-patterns/SKILL.md` + its `scripts/` — hand-authored, Git-managed, distributed from the repo |

`docs-src/<kind>/` maps to `docs/<kind>/` (components→components, hooks→api, plus concepts, patterns,
pages). Every outline declares `kind: code-backed` or `kind: prose` in its frontmatter — code-backed
units also declare a `sources:` glob binding them to the exports they document, and `docs:check`
reconciles that against `index.ts` both ways. Frontmatter is a closed schema: an unrecognised key is
an error, not a silent no-op.

There are **no exceptions**: every file under `docs/` comes from an outline. The root guides
(`index`, `introduction`, `quickstart`, `design-philosophy`, `migrations`) are `kind: prose` units in
`docs-src/guides/` that happen to output to the `docs/` root. Creating a file under `docs/` that no
outline produces is a blocking `docs:check` failure.

`docs/index.md` is the content-routing entrypoint. Edit its reading guidance in
`docs-src/guides/index.docs.outline.md`; the `<!-- docs-index -->` token generates the document
list from outline titles, descriptions, and output paths. Core's `prepack` copies the whole
`docs/` tree into ignored `packages/core/docs/` for npm. Skills are not generated or bundled in
npm; they locate the installed package's version-matched docs. See
[decisions/skill-documentation-separation.md](./decisions/skill-documentation-separation.md).

## Key Architecture Points (LLM Orientation)

### Monorepo Structure

- **packages/core**: Main library (@tailor-platform/app-shell) - React components with shadcn/ui, built with Vite
- **examples/**: Vite example implementation plus consolidated UI showcase

### Essential Concepts for Code Navigation

- **Module System**: `defineModule()` creates top-level nav items, `defineResource()` creates pages/sub-pages
- **Routing**: Uses react-router v8 (not Next.js file-based routing)
- **Redirects**: Use a guard returning `redirectTo("/path")`. The older `defaultResourceRedirectPath` prop and `redirectToResource()` helper were both removed (in 0.13.0 and 0.24.0 respectively) and no longer exist
- **Core Components**: `AppShell` (root provider), `SidebarLayout` (default layout)
- **Context**: Access via `useAppShell()` hook

### Core Package Structure (`packages/core/src/`)

| Path                      | Description                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| `components/`             | React components - SidebarLayout, CommandPalette, UI primitives (`ui/`)                  |
| `components/appshell.tsx` | Main AppShell component - root provider that wires everything together                   |
| `contexts/`               | Context Providers - app state, authentication, theming                                   |
| `routing/`                | React Router integration - router setup, route generation, path utilities                |
| `hooks/`                  | Custom hooks - i18n, mobile detection, toast                                             |
| `lib/`                    | Utility functions - `cn` (className merging), i18n (locale detection, string resolution) |
| `assets/`                 | Static assets (CSS themes)                                                               |
| `index.ts`                | Public API exports                                                                       |
| `resource.tsx`            | Types and interfaces (Module, Resource, etc.)                                            |

## Testing & Quality

**📋 For formatting, type-check, and lint procedures, see:** [Quality Check Skill](./.agents/skills/quality-check/SKILL.md)

## Versioning & Publishing

**📋 For changeset creation procedures, see:** [Create Changeset Skill](./.agents/skills/create-changeset/SKILL.md)

## Package Design & Review

**📋 For public API patterns, styling/export rules, implementation procedures, and package review guidance, use:** [Code Review Skill](./.agents/skills/code-review/SKILL.md)
