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

### UI Components

- **[Button](./docs/components/button.md)** - Styled button with variants and sizes
- **[Input](./docs/components/input.md)** - Styled text input
- **[Table](./docs/components/table.md)** - Semantic HTML table sub-components
- **[Dialog](./docs/components/dialog.md)** - Modal dialog with compound component API
- **[Menu](./docs/components/menu.md)** - Dropdown menu with compound component API, checkbox/radio items, groups, and sub-menus
- **[Sheet](./docs/components/sheet.md)** - Slide-in panel with swipe-to-dismiss support
- **[Tooltip](./docs/components/tooltip.md)** - Hover/focus tooltip with placement options
- **[Select](./docs/components/select.md)** - Single or multi-select dropdown with optional async loading
- **[Combobox](./docs/components/combobox.md)** - Searchable combobox with filtering, multi-select, async loading, and creatable items
- **[Autocomplete](./docs/components/autocomplete.md)** - Free-text input with a suggestion list and optional async loading

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

**📋 For changeset creation procedures, see:** [Create Changeset Skill](./.agents/skills/create-changeset/SKILL.md)

## API Design & Component Styling

**📋 For component export patterns, styling rules, and implementation procedures, see:** [Add Component Skill](./.agents/skills/add-component/SKILL.md)
