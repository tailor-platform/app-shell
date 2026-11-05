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

| To document…                                  | Edit (authored source)                                                                                    |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| a component / hook / pattern / page / concept | `docs-src/<kind>/<slug>.docs.outline.md` (prose) + optional `<slug>.docs.examples.tsx` (runnable example) |
| the consumer `app-shell-patterns` skill       | emitted from `docs-src/` by `docs:sync` — never edit `packages/core/skills/`                              |

`docs-src/<kind>/` maps to `docs/<kind>/` (components→components, hooks→api, plus concepts, patterns,
pages). Every outline declares `kind: code-backed` or `kind: prose` in its frontmatter — code-backed
units also declare a `sources:` glob binding them to the exports they document, and `docs:check`
reconciles that against `index.ts` both ways. Frontmatter is a closed schema: an unrecognised key is
an error, not a silent no-op.

There are **no exceptions**: every file under `docs/` comes from an outline. The root guides
(`introduction`, `quickstart`, `design-philosophy`, `migrations`) are `kind: prose` units in
`docs-src/guides/` that happen to output to the `docs/` root. Creating a file under `docs/` that no
outline produces is a blocking `docs:check` failure.

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

| Path                    | Description                                                                                                                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/<name>/`    | One directory per public component family (e.g. `sidebar/` with `SidebarLayout`, `command-palette/`, `button/`), entrypoint `index.ts`                                                        |
| `components/appshell/`  | Main `AppShell` component - root provider that wires everything together                                                                                                                      |
| `components/internals/` | Non-exported UI building blocks shared by several component families (e.g. `breadcrumb`, `separator`, `sonner`, `item-list-base`)                                                             |
| `contexts/`             | Context providers - app state, authentication, theming, breadcrumbs, command palette                                                                                                          |
| `routing/`              | React Router integration - router setup, route generation, navigation, path utilities, document head                                                                                          |
| `fs-routes/`            | Internal file-based routing (route conversion, typed paths)                                                                                                                                   |
| `hooks/`                | Custom hooks - i18n (`defineI18nLabels`), responsive/mobile detection, toast, collection variables, pagination, page meta                                                                     |
| `lib/`                  | Helpers and logic, exported or not - `cn` (`utils`), i18n locale resolution, `aggregations`, `collection-url-state`, input classes, etc.                                                      |
| `ai/`                   | AI chat client, tool execution, and `useAIChat`                                                                                                                                               |
| `testing/`              | Test-only `@tailor-platform/app-shell/testing` entrypoint (memory routing)                                                                                                                    |
| `assets/`               | Static assets (CSS themes, fonts), copied wholesale to `dist/` via Vite's `publicDir` and included in the npm package even when unreferenced. Keep internal/development-only files elsewhere. |
| `index.ts`              | Public API exports                                                                                                                                                                            |
| `resource.tsx`          | Types and interfaces (Module, Resource, etc.)                                                                                                                                                 |

**Where shared, non-exported code goes:** `components/internals/<name>/` holds UI building blocks
reused by several component families (keep a piece with its narrower owner, such as `sidebar/` or
`routing/`, when it has one). `lib/` holds helpers and logic whether or not they are publicly
exported. React code is fine in either; the split is UI building block versus helper. See
[component-design.md](./.agents/references/component-design.md#standard-filesystem-shape).

## Testing & Quality

**📋 For formatting, type-check, and lint procedures, see:** [Quality Check Skill](./.agents/skills/quality-check/SKILL.md)

## Versioning & Publishing

**📋 For changeset creation procedures, see:** [Create Changeset Skill](./.agents/skills/create-changeset/SKILL.md)

## Package Design & Review

**📋 For public API patterns, styling/export rules, implementation procedures, and package review guidance, use:** [Code Review Skill](./.agents/skills/code-review/SKILL.md)
