# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**📋 For the end-to-end contribution workflow (issue → branch → develop → PR → release), see:** [CONTRIBUTING.md](./CONTRIBUTING.md)

## Project Overview

Tailor Platform AppShell - A React-based framework for building ERP applications with opinionated layouts and authentication.

**📖 For complete overview and quickstart guide, see:** [README.md](./README.md)

## Commands

**📋 For development commands and setup, see:** [CONTRIBUTING.md](./CONTRIBUTING.md)

## Documentation Index

All files under [`docs/`](./docs/) are user-facing documentation for library consumers. The tree is
convention-based rather than hand-listed, so a new page needs no edit here — place it by its kind:

| Path                        | Holds                                                                                                                             |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `docs/introduction.md`      | What AppShell is and when to reach for it                                                                                         |
| `docs/quickstart.md`        | The shortest path from an empty app to a running one                                                                              |
| `docs/design-philosophy.md` | The reasoning behind the opinionated defaults                                                                                     |
| `docs/migrations.md`        | Version-to-version upgrade notes, one row per release that needs consumer action                                                  |
| `docs/concepts/`            | Cross-cutting guides — authentication, routing, styling, sidebar navigation                                                       |
| `docs/components/`          | One page per exported component, named for its kebab-cased export (`DataTable` → `data-table.md`)                                 |
| `docs/api/`                 | One page per exported hook or function (`useAppShell` → `use-app-shell.md`), with `guards/` and `router/` grouping those families |

Routing a change: a component's props or behavior belongs in its `docs/components/` page; a hook or
function in its `docs/api/` page; anything spanning several exports in `docs/concepts/`. A new export
gets a new page in the matching directory rather than a section appended to a neighbour.

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
