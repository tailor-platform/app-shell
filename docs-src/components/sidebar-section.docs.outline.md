---
kind: code-backed
group: sidebar-section
title: SidebarSection
description: Static, non-collapsible heading for grouping flat sidebar navigation items
sources:
  - packages/core/src/components/sidebar/sidebar-section.tsx
---

# SidebarSection

`SidebarSection` places a static heading above a run of flat navigation items. Unlike [`SidebarGroup`](./sidebar-group.md), a section is neither collapsible nor navigable, and its items keep the same styling and indentation as top-level items.

## Import

```tsx
import { SidebarSection } from "@tailor-platform/app-shell";
```

## Basic Usage

```tsx
import {
  DefaultSidebar,
  SidebarItem,
  SidebarSection,
  SidebarSeparator,
} from "@tailor-platform/app-shell";

<DefaultSidebar>
  <SidebarItem to="/overview" />

  <SidebarSeparator />

  <SidebarSection title="Services">
    <SidebarItem to="/ai-gateways" />
    <SidebarItem to="/applications" />
    <SidebarItem to="/auth-connections" />
  </SidebarSection>

  <SidebarSeparator />

  <SidebarSection title="Logs">
    <SidebarItem to="/activity-logs" />
    <SidebarItem to="/dataplane-logs" />
  </SidebarSection>
</DefaultSidebar>;
```

## Props

| Prop       | Type                        | Default      | Description                       |
| ---------- | --------------------------- | ------------ | --------------------------------- |
| `title`    | `string \| LocalizedString` | **Required** | Section heading (supports i18n)   |
| `children` | `React.ReactNode`           | **Required** | Child items (usually SidebarItem) |

## Behavior

- **Not interactive.** The heading is plain text: it is not a link and has no expand/collapse toggle.
- **Flat items.** Children render at the same level as top-level `SidebarItem`s, not as an indented submenu.
- **Icon rail.** When the sidebar collapses to an icon rail, the heading is hidden and the items stay in the rail as ordinary icons. Unlike `SidebarGroup`, there is no hover flyout.
- **No automatic dividers.** Add a `SidebarSeparator` between sections where you want a line.

## Internationalization

Titles support i18n with `defineI18nLabels`:

```tsx
import { defineI18nLabels } from "@tailor-platform/app-shell";

const labels = defineI18nLabels({
  en: { services: "Services" },
  ja: { services: "サービス" },
});

<SidebarSection title={labels.t("services")}>
  <SidebarItem to="/ai-gateways" />
</SidebarSection>;
```

## When to Use

**Use SidebarSection when:**

- You want to label a run of items with a heading, but keep them always visible
- The items are peers of your top-level items, not children of a parent page
- You want the items to stay as individual icons in the icon rail

**Use SidebarGroup when:**

- Users should be able to collapse the items
- The items belong under a parent with its own icon (or landing page via `to`)
- You need nesting

| Feature             | SidebarSection    | SidebarGroup              |
| ------------------- | ----------------- | ------------------------- |
| **Collapsible**     | ❌ No             | ✅ Yes                    |
| **Heading is link** | ❌ No             | Optional (`to` prop)      |
| **Icon**            | ❌ No             | Optional                  |
| **Child styling**   | Same as top level | Indented submenu          |
| **Icon rail**       | Heading hidden    | Group icon opens a flyout |
| **Nesting**         | Not intended      | Can contain groups        |

## Accessibility

The children are rendered as their own list, labelled by the heading, so screen readers announce the section name (for example, "Services, list, 3 items") when entering it.

## Related Components

- [SidebarGroup](./sidebar-group.md) - Collapsible, nested navigation groups
- [SidebarItem](./sidebar-item.md) - Individual navigation items
- [DefaultSidebar](./default-sidebar.md) - Container for sidebar navigation

## Related Concepts

- [Sidebar Navigation](../concepts/sidebar-navigation.md) - Sidebar customization guide
