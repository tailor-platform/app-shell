---
group: spinner
title: Spinner
description: Lightweight loading indicator component with accessible defaults and preset sizes
sources:
  - packages/core/src/components/spinner/**
---

# Spinner

`Spinner` is AppShell's reusable loading indicator. It renders a small rotating SVG and is used throughout the built-in UI for loading states such as `ActionPanel`, command palette search, and CSV import progress.

## Import

```tsx
import { Spinner } from "@tailor-platform/app-shell";
```

## Basic usage

<!-- example: basic-usage -->

## Props

`Spinner` accepts all standard `<svg>` props plus one AppShell prop:

| Prop   | Type                                | Default     | Description                                                                |
| ------ | ----------------------------------- | ----------- | -------------------------------------------------------------------------- |
| `size` | `"xs" \| "sm" \| "default" \| "lg"` | `"default"` | Preset square size. Ignored when `width` or `height` is passed explicitly. |

Preset sizes map to:

| `size`      | Pixels |
| ----------- | ------ |
| `"xs"`      | `12`   |
| `"sm"`      | `14`   |
| `"default"` | `16`   |
| `"lg"`      | `20`   |

## Accessibility

`Spinner` defaults to decorative output unless you give it an accessible name:

- with `aria-label` or `aria-labelledby`, it renders with `role="status"`
- with `aria-hidden={true}`, it stays decorative
- with neither, it is treated as decorative and gets `aria-hidden="true"`

Use a label when the spinner is the primary visible loading affordance:

```tsx
<Spinner size="sm" aria-label="Loading orders" />
```

When the surrounding control already has its own accessible name, keep the spinner decorative:

```tsx
<Button disabled>
  <Spinner size="sm" aria-hidden />
  Saving
</Button>
```

## Sizing and styling

Pass ordinary Tailwind utilities through `className` for color and layout, or override the dimensions directly with `width` / `height`.

```tsx
<Spinner className="text-muted-foreground" />
<Spinner size="lg" className="text-primary" aria-label="Generating report" />
<Spinner width={24} height={24} aria-label="Loading" />
```

## Related

- [ActionPanel](./action-panel.md) - uses `Spinner` for per-row loading states
- [WithGuard](./with-guard.md) - common place to render a loading spinner while guards resolve
