---
title: Tabs
description: Tab navigation with a compound component API
---

# Tabs

The `Tabs` component provides tab-based navigation for toggling between related panels on the same page. It is backed by Base UI's Tabs primitive.

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

| Prop            | Type                         | Default        | Description                             |
| --------------- | ---------------------------- | -------------- | --------------------------------------- |
| `defaultValue`  | `Tabs.Tab.Value`             | `0`            | Initial active tab value (uncontrolled) |
| `value`         | `Tabs.Tab.Value`             | -              | Controlled active tab value             |
| `onValueChange` | `(value: any) => void`       | -              | Callback when the active tab changes    |
| `orientation`   | `'horizontal' \| 'vertical'` | `'horizontal'` | Orientation of the tabs                 |
| `className`     | `string`                     | -              | Additional CSS classes for root         |
| `children`      | `React.ReactNode`            | -              | Tabs sub-components                     |

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
