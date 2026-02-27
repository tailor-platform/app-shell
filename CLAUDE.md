# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tailor Platform AppShell - A React-based framework for building ERP applications with opinionated layouts, authentication, and module federation.

**📖 For complete overview and quickstart guide, see:** [README.md](./README.md)

## Commands

**📋 For complete development commands and setup instructions, see:** [README.md - Development Commands](./README.md#development-commands)

## Documentation Index

This project has comprehensive documentation organized in the `docs/` directory:

### Core Documentation
- **[API Reference](./docs/api.md)** - Complete API documentation for all components, hooks, and functions
- **[Module & Resource Definition](./docs/module-resource-definition.md)** - How to structure your application using modules and resources
- **[Routing & Navigation](./docs/routing-and-navigation.md)** - Understanding AppShell's routing system
- **[Sidebar Navigation](./docs/sidebar-navigation.md)** - Customizing sidebar with SidebarItem, SidebarGroup components

### Setup & Configuration  
- **[Authentication](./docs/authentication.md)** - Setting up user authentication
- **[Styles](./docs/styles.md)** - Theming and styling configuration

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

| Path | Description |
|------|-------------|
| `components/` | React components - SidebarLayout, CommandPalette, UI primitives (`ui/`) |
| `components/appshell.tsx` | Main AppShell component - root provider that wires everything together |
| `contexts/` | Context Providers - app state, authentication, theming |
| `routing/` | React Router integration - router setup, route generation, path utilities |
| `hooks/` | Custom hooks - i18n, mobile detection, toast |
| `lib/` | Utility functions - `cn` (className merging), i18n (locale detection, string resolution) |
| `assets/` | Static assets (CSS themes) |
| `index.ts` | Public API exports |
| `resource.tsx` | Types and interfaces (Module, Resource, etc.) |

## Testing & Quality

```bash
# Run tests in core package
cd packages/core && pnpm test

# Type checking
pnpm type-check
```

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

## API Design Principles

When adding or modifying public exports in `packages/core/src/index.ts`, follow these guidelines:

### 1. Minimize Public API Surface
- **DO**: Export only the component and its primary props type (e.g., `DescriptionCard` and `DescriptionCardProps`)
- **DON'T**: Export internal/helper types that can be inferred from the main props type
- **Rationale**: Smaller API surface reduces potential conflicts with future APIs and makes the library easier to maintain

### 2. Leverage TypeScript Type Inference
- **DO**: Let consumers infer nested types from component props using TypeScript's type utilities
- **DON'T**: Export every single type used internally by a component
- **Example**: 
  ```typescript
  // Good - minimal exports
  export { DescriptionCard, type DescriptionCardProps } from "./components/description-card";
  
  // Consumers can infer field types if needed:
  type FieldConfig = DescriptionCardProps['fields'][number];
  ```

### 3. Type Guards and Utilities
- **DO**: Only export type guards/utilities if they're essential for common consumer use cases
- **DON'T**: Export type guards for internal discriminated unions (consumers can use simple checks like `field.type === "divider"`)
- **Rationale**: Reduces API bloat; simple type checks are often sufficient

### 4. Component Export Pattern
For new components, follow this minimal export pattern:
```typescript
// index.ts
export { 
  ComponentName, 
  type ComponentNameProps 
} from "./components/component-name";

// Avoid exporting:
// - Internal helper types (FieldConfig, FieldDefinition, etc.)
// - Type guards (isDivider, isFieldDefinition, etc.) 
// - Enum-like types (FieldType, EmptyBehavior, etc.)
// - Metadata types (FieldMeta, etc.)
```

## Component Styling Guidelines

When developing or modifying AppShell components, follow these rules to maintain consistency and best practices:

### 1. Use Native Tailwind CSS v4 Utilities
- **DO**: Use Tailwind's native utility classes (e.g., `astw:@container`, `astw:grid-cols-2`, `astw:@[400px]:grid-cols-3`)
- **DON'T**: Inject plain CSS via `<style>` tags, `dangerouslySetInnerHTML`, or CSS-in-JS libraries
- **Rationale**: Better tooling support, type safety, maintainability, and smaller bundle size

### 2. Container Queries
- **DO**: Use Tailwind's container query utilities with arbitrary values:
  ```tsx
  <div className="astw:@container">
    <div className="astw:grid astw:grid-cols-1 astw:@[400px]:grid-cols-2 astw:@[600px]:grid-cols-3">
  ```
- **DON'T**: Write custom CSS with `@container` rules or use inline styles for container queries
- **Rationale**: Tailwind v4 has native container query support that's more maintainable

### 3. No @source Directives Required
- **DO**: Let Tailwind automatically scan component files
- **DON'T**: Add `@source` directives to `globals.css` or user-facing CSS files for component styles
- **Rationale**: Users shouldn't need to manually configure CSS scanning when using AppShell

### 4. Framework Agnostic Components
- **DO**: Write components that work with any React setup
- **DON'T**: Add framework-specific directives like `"use client";` unless absolutely necessary
- **Rationale**: AppShell should work with Next.js, Vite, Remix, or any React renderer

### 5. Component-Specific Styles
- **DO**: Keep styles scoped to components using Tailwind classes
- **DON'T**: Add component-specific CSS classes to `globals.css` 
- **Rationale**: Components should be self-contained and portable

### Examples

**Good** - Using Tailwind container queries:
```tsx
const gridClasses = cn(
  "astw:grid astw:gap-x-6 astw:gap-y-4",
  "astw:grid-cols-1",
  columns === 4
    ? "astw:@[400px]:grid-cols-2 astw:@[600px]:grid-cols-3 astw:@[800px]:grid-cols-4"
    : "astw:@[400px]:grid-cols-2 astw:@[600px]:grid-cols-3"
);

return (
  <div className="astw:@container">
    <div className={gridClasses}>
      {/* content */}
    </div>
  </div>
);
```

**Bad** - CSS injection:
```tsx
const STYLES = `
  .custom-container {
    container-type: inline-size;
  }
  @container (min-width: 400px) {
    .custom-grid { grid-template-columns: repeat(2, 1fr); }
  }
`;

return (
  <>
    <style dangerouslySetInnerHTML={{ __html: STYLES }} />
    <div className="custom-container">
      {/* content */}
    </div>
  </>
);
```
