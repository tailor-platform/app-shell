# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tailor Platform AppShell - A React-based framework for building ERP applications with opinionated layouts, authentication, and module federation.

**📖 For complete overview and quickstart guide, see:** [README.md](./README.md)

## Commands

**📋 For development commands, see:** [README.md - Development](./README.md#development)

## Documentation Index

This project has comprehensive documentation organized in the `docs/` directory:

- **[Introduction](./docs/introduction.md)** - What is AppShell and why use it
- **[Quick Start](./docs/quickstart.md)** - Installation, setup, and first steps

## Key Architecture Points (LLM Orientation)

### Monorepo Structure

- **packages/core**: Main library (@tailor-platform/app-shell) - React components with shadcn/ui, built with tsup
- **examples/**: Next.js and Vite example implementations

### Essential Concepts for Code Navigation

- **Module System**: `defineModule()` creates top-level nav items, `defineResource()` creates pages/sub-pages
- **Routing**: Uses react-router v7 (not Next.js file-based routing)
- **Redirects**: Use `redirectToResource()` helper instead of deprecated `defaultResourceRedirectPath`
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

## Local Development

```bash
# Install dependencies
pnpm install

# Start dev server (opens localhost:3000 with example app)
pnpm dev
```

## Versioning & Publishing

Uses changesets for version management.

### Publishing Process

1. Run `npx changeset` and follow the prompts (select "@tailor-platform/app-shell" as the package)
2. Edit the new file created in `.changeset/` to describe your change (changeset will remove it when making its automatic PR; the description is saved in CHANGELOG.md and the GitHub Release)
3. Open a PR to `main` from your feature branch
4. Changeset will open a PR for the release — merging it publishes the new version to NPM

### When to Create Changesets

**DO create changesets for changes that affect end-users:**

- New features (new components, hooks, utilities)
- Bug fixes that change behavior
- API changes (new props, changed function signatures)
- Breaking changes
- Performance improvements
- Documentation that affects API usage

**For API-level changes, include code examples in the changeset:**

- Show minimal code examples demonstrating how to use the new API
- For breaking changes, provide before/after examples showing how to migrate
- Include usage examples for new components, hooks, or utilities

**DO NOT create changesets for:**

- Internal refactoring that doesn't change behavior
- Removing unused dependencies
- Build/dev tooling changes
- Test-only changes
- Code style/formatting changes
- Internal type changes that don't affect public API

Note, when ClaudeCode is authoring changes that require a changeset:

1. See all changes in the current branch
2. Create a new changeset markdown under `.changeset` with 2-3 lines of summary and code examples if needed

Then prompt the user to proceed with publishing the change.

## API Design & Component Styling

**📋 For component export patterns, styling rules, and implementation procedures, see:** [Add Component Skill](./.agents/skills/add-component/SKILL.md)
