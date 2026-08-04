---
title: Tabs
description: Tab navigation with a compound component API
---

# Tabs

The `Tabs` component provides tab-based navigation for toggling between related panels on the same page. It is backed by Base UI's Tabs primitive.

[Live preview in the UI Catalogue →](https://ui.tailor.tech/components/tabs)

## Import

```tsx
import { Tabs } from "@tailor-platform/app-shell";
```

## Basic Usage

```tsx
<Tabs.Root defaultValue="overview">
  <Tabs.List>
    <Tabs.Tab value="overview">Overview</Tabs.Tab>
    <Tabs.Tab value="projects">Projects</Tabs.Tab>
    <Tabs.Tab value="account">Account</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="overview">Overview content</Tabs.Panel>
  <Tabs.Panel value="projects">Projects content</Tabs.Panel>
  <Tabs.Panel value="account">Account content</Tabs.Panel>
</Tabs.Root>
```

## Sub-components

| Sub-component | Description                                                    |
| ------------- | -------------------------------------------------------------- |
| `Tabs.Root`   | Manages tab selection state                                    |
| `Tabs.List`   | Groups the individual tab buttons                              |
| `Tabs.Tab`    | An interactive tab button that toggles the corresponding panel |
| `Tabs.Panel`  | A panel displayed when the corresponding tab is active         |

## Props

### Tabs.Root Props

| Prop            | Type                                | Default     | Description                                                   |
| --------------- | ----------------------------------- | ----------- | ------------------------------------------------------------- |
| `defaultValue`  | `Tabs.Tab.Value`                    | `0`         | Initial active tab value (uncontrolled)                       |
| `value`         | `Tabs.Tab.Value`                    | -           | Controlled active tab value                                   |
| `onValueChange` | `(value: any) => void`              | -           | Callback when the active tab changes                          |
| `variant`       | `'default' \| 'line' \| 'capsule'`  | `'default'` | Visual style of the tabs                                      |
| `size`          | `'xs' \| 'sm' \| 'default' \| 'lg'` | `'default'` | Minimum size (`capsule` only) — mirrors Button's height tiers |
| `className`     | `string`                            | -           | Additional CSS classes for root                               |
| `children`      | `React.ReactNode`                   | -           | Tabs sub-components                                           |

### Tabs.List Props

Accepts `className` and all standard HTML `<div>` props.

### Tabs.Tab Props

| Prop       | Type             | Default | Description                        |
| ---------- | ---------------- | ------- | ---------------------------------- |
| `value`    | `Tabs.Tab.Value` | -       | **Required.** The value of the tab |
| `disabled` | `boolean`        | -       | Whether the tab is disabled        |

Also accepts `className` and all standard HTML `<button>` props.

### Tabs.Panel Props

| Prop          | Type             | Default | Description                                            |
| ------------- | ---------------- | ------- | ------------------------------------------------------ |
| `value`       | `Tabs.Tab.Value` | -       | **Required.** The value matching the corresponding tab |
| `keepMounted` | `boolean`        | `false` | Whether to keep the panel in the DOM when hidden       |

Also accepts `className` and all standard HTML `<div>` props.

## Controlled Usage

```tsx
const [activeTab, setActiveTab] = useState("overview");

<Tabs.Root value={activeTab} onValueChange={setActiveTab}>
  <Tabs.List>
    <Tabs.Tab value="overview">Overview</Tabs.Tab>
    <Tabs.Tab value="details">Details</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="overview">Overview content</Tabs.Panel>
  <Tabs.Panel value="details">Details content</Tabs.Panel>
</Tabs.Root>;
```

## Examples

### With Disabled Tab

```tsx
<Tabs.Root defaultValue="active">
  <Tabs.List>
    <Tabs.Tab value="active">Active</Tabs.Tab>
    <Tabs.Tab value="pending">Pending</Tabs.Tab>
    <Tabs.Tab value="archived" disabled>
      Archived
    </Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="active">Active items</Tabs.Panel>
  <Tabs.Panel value="pending">Pending items</Tabs.Panel>
  <Tabs.Panel value="archived">Archived items</Tabs.Panel>
</Tabs.Root>
```

### Use Icons in Tab

In the `capsule` variant, a tab whose only child is an icon renders **square** —
its `min-width` matches its `min-height` — making it a natural fit for icon-only
view toggles (e.g. table/kanban). Use `size` to align the track with a sibling
`Button`: `size="default"` (36px) matches `Button`'s default height. Unsized
icons default to `16px`, so the square is consistent regardless of the icon.

> **Accessibility:** an icon-only tab has no visible text, so give each one an
> `aria-label`. Without it, screen readers announce an unnamed tab.

```tsx
<Tabs.Root defaultValue="overview" variant="capsule" size="default">
  <Tabs.List>
    <Tabs.Tab value="overview" aria-label="Overview">
      <LayoutDashboardIcon />
    </Tabs.Tab>
    <Tabs.Tab value="projects" aria-label="Projects">
      <FolderKanbanIcon />
    </Tabs.Tab>
    <Tabs.Tab value="settings" aria-label="Settings">
      <SettingsIcon />
    </Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="overview">Overview content</Tabs.Panel>
  <Tabs.Panel value="projects">Projects content</Tabs.Panel>
  <Tabs.Panel value="settings">Settings content</Tabs.Panel>
</Tabs.Root>
```

### Sizing the capsule variant

`size` mirrors `Button`'s height tiers, so a capsule can sit flush next to a
button. The value sets a **minimum** height — taller content still grows.

| `size`    | Track height | Matches Button |
| --------- | ------------ | -------------- |
| `xs`      | 28px         | `size="xs"`    |
| `sm`      | 32px         | `size="sm"`    |
| `default` | 36px         | default        |
| `lg`      | 40px         | `size="lg"`    |
