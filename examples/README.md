# Examples

This directory contains example applications demonstrating different ways to use AppShell. All examples implement the same **Project Manager** application with identical screens, but use different AppShell APIs for routing and navigation.

## Directory Structure

```
examples/
├── shared-pages/          # Shared React components (page UIs)
├── file-based/            # File-based routing API (Vite)
└── legacy-declarative/    # Declarative API with defineModule/defineResource (Next.js)
```

## Examples Overview

### `shared-pages` — Shared Page Components

A standalone package that exports pure React components used by both example apps. This demonstrates how to create a **shared UI library** consumed by multiple host applications.

- **No routing logic** — components don't use `defineModule` or `defineResource`
- **Framework-agnostic** — works with any React setup
- **Exports**: `ProjectListPage`, `ProjectDetailPage`, `TaskListPage`, `DescriptionCardDemoPage`, layout demos, `ProfileSettingsPage`, plus shared context (`RoleSwitcherProvider`, `SidebarMenu`)

### `file-based` — File-Based Routing (Vite)

Demonstrates the **file-based routing API** using the AppShell Vite plugin. Routes are automatically generated from the `src/pages/` directory structure.

**Key patterns shown:**
- `appShellPageProps` static field for page metadata (title, icon, guards)
- Type-safe navigation with auto-generated `paths.for()`
- Manual sidebar composition with `SidebarItem`, `SidebarGroup`, `WithGuard`
- `CommandPalette` for keyboard navigation (Cmd+K)

```bash
cd examples/file-based && pnpm dev
```

### `legacy-declarative` — Declarative API (Next.js)

Demonstrates the **declarative API** using `defineModule()` and `defineResource()`. The module tree is explicitly constructed in code and passed to `AppShell` via the `modules` prop.

**Key patterns shown:**
- `defineModule()` / `defineResource()` for module hierarchy
- `modules` and `settingsResources` props on `AppShell`
- Auto-generated sidebar navigation from module definitions
- `basePath` for mounting AppShell under a sub-route
- `guards` on modules for access control

```bash
cd examples/legacy-declarative && pnpm dev
```

## Screen Set

Both examples render the same screens for comparison:

| Module | Screen | Path | Features Demonstrated |
|--------|--------|------|----------------------|
| **Projects** | Project List | `/projects` | List UI, `Link`, nested routing |
| | Project Detail | `/projects/:id` | Dynamic routes, `useParams`, `DescriptionCard` |
| **Tasks** | Task List | `/tasks` | `Guard` (admin-only), role-based access control |
| **Components** | DescriptionCard Demo | `/components/description-card` | Field types: badge, money, date, address, copyable |
| | Layout 1 Column | `/components/layout-1-column` | `Layout` component, single column |
| | Layout 2 Columns | `/components/layout-2-columns` | `Layout` with actions (buttons) |
| | Layout 3 Columns | `/components/layout-3-columns` | `Layout` three-column responsive |
| **Settings** | Profile | `/settings/profile` | `settingsResources` |

> **Note:** In the `legacy-declarative` example, all paths are prefixed with `/dashboard/` (e.g., `/dashboard/projects`) because AppShell is mounted under a Next.js catch-all route with `basePath: "dashboard"`.

## Role Switching

Both examples include a role switcher in the sidebar footer. Toggle between **Admin** and **Staff** roles to see:
- The **Tasks** page appears/disappears based on the admin-only guard
- `contextData.role` flowing through to guard functions
