---
kind: code-backed
group: alert
title: Alert
description: Contextual status messages with automatic variant icons
sources:
  - packages/core/src/components/alert/**
---

# Alert

The `Alert` component is a compound component for displaying contextual status messages. It automatically renders a matching icon for each variant and supports optional action buttons and dismiss behavior.

## Import

```tsx
import { Alert } from "@tailor-platform/app-shell";
```

The examples below also import `useState` from `react`, and `Button`, `Text`, and `alertVariants` from `@tailor-platform/app-shell`.

## Basic Usage

<!-- example: basic-usage -->

## Sub-components

| Sub-component       | Description                                       |
| ------------------- | ------------------------------------------------- |
| `Alert.Root`        | Container with variant styling and automatic icon |
| `Alert.Title`       | Bold title line of the alert                      |
| `Alert.Description` | Additional descriptive text below the title       |

<!-- api -->

All standard HTML `<div>` props are also accepted.

## Variants

Each variant automatically renders a contextual icon:

<!-- example: variants -->

| Variant   | Automatic Icon      | Color palette   |
| --------- | ------------------- | --------------- |
| `neutral` | Message circle icon | Muted surface   |
| `success` | Check circle icon   | Green           |
| `warning` | Alert triangle icon | Yellow          |
| `error`   | X circle icon       | Red/destructive |
| `info`    | Info icon           | Blue            |

## With Action Button

Use the `action` prop to render an action element below the description:

<!-- example: with-action -->

## Dismissible Alert

Set `dismissible` to show a close button. Use `onDismiss` to react when the alert is dismissed:

<!-- example: dismissible-alert -->

> **Note:** When `dismissible` is `true`, clicking the close button hides the alert via internal state. The `onDismiss` callback fires after the alert is hidden.

## Examples

### Warning with Action

This example records the action locally instead of navigating away from the documentation or changing billing information.

<!-- example: warning-with-action -->

## Accessibility

- The root element has `role="alert"` so screen readers announce the message.
- The dismiss button has `aria-label="Dismiss"`.
- Variant icons are marked `aria-hidden` and are decorative only — the text content carries the meaning.

## Styling

Alerts are styled with the library's internal `astw:`-prefixed utilities. Write **plain** Tailwind utilities in your own markup, and reach for `variant` rather than restyling what `Alert` sets itself — see [Styling AppShell components](../concepts/styling-theming.md#styling-appshell-components). Customize appearance using:

1. **Using `className`** on `Alert.Root` for additional styles
2. **Using `alertVariants`** utility to apply variant classes to custom elements

<!-- example: styling-utility -->

## Related Components

- [Badge](./badge.md) - Inline status labels
- [Button](./button.md) - Use as action element inside alerts
