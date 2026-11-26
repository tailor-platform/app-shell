---
kind: code-backed
group: badge
title: Badge
description: Display status, labels, and tags with customizable variants
sources:
  - packages/core/src/components/badge/**
  - packages/core/src/components/badge-list/**
---

# Badge

The `Badge` component displays status indicators, labels, and tags with multiple style variants. It's commonly used to show document status, priority levels, or categorical information.

## Import

```tsx
import { Badge, type BadgeVariant, type BadgeOptions } from "@tailor-platform/app-shell";
```

The examples below also import `badgeVariants` from `@tailor-platform/app-shell` and `AlertCircle`, `CheckCircle`, and `XCircle` from `lucide-react`.

## Basic Usage

<!-- example: basic-usage -->

## Variants

### Solid and Subtle Variants

Filled variants for high emphasis, plus subtle variants for lower-emphasis status labels:

<!-- example: solid-and-subtle-variants -->

### Outline Variants with Status Dots

Outlined badges with colored status dots for subtle emphasis:

<!-- example: outline-variants -->

<!-- api -->

### Badge Variants

```typescript
type BadgeVariant =
  // Solid/subtle variants
  | "default" // Primary color
  | "success" // Green
  | "warning" // Yellow
  | "error" // Red/destructive
  | "neutral" // Gray/secondary
  | "info" // Blue
  | "subtle-success" // Low-emphasis green
  | "subtle-warning" // Low-emphasis yellow
  | "subtle-error" // Low-emphasis red/destructive
  | "subtle-info" // Low-emphasis blue
  | "subtle-neutral" // Low-emphasis gray
  // Outline variants with status dots
  | "outline-success"
  | "outline-warning"
  | "outline-error"
  | "outline-info"
  | "outline-neutral";
```

### BadgeOptions

Shared options used by `DataTable` and `DescriptionCard` badge fields:

```typescript
interface BadgeOptions {
  /** Maps each value (stringified) to a Badge variant. Unmapped values use `defaultBadgeVariant`. */
  badgeVariantMap?: Record<string, BadgeVariant>;
  /** Maps each value (stringified) to a display label. Unmapped values render the raw value. */
  badgeLabelMap?: Record<string, string>;
  /** Variant used when the value is not in `badgeVariantMap`. Default: `"outline-neutral"`. */
  defaultBadgeVariant?: BadgeVariant;
}
```

## Examples

### Order Status

<!-- example: order-statuses -->

### Priority Badges

```tsx
const priorities = [
  { label: "Low", variant: "outline-neutral" },
  { label: "Medium", variant: "outline-info" },
  { label: "High", variant: "outline-warning" },
  { label: "Critical", variant = "error" },
];

<div className="flex gap-2">
  {priorities.map((p) => (
    <Badge key={p.label} variant={p.variant}>
      {p.label}
    </Badge>
  ))}
</div>;
```

### With Icons

<!-- example: with-icons -->

### Dynamic Variant Selection

<!-- example: dynamic-variants -->

### Custom Styling

<!-- example: custom-styling -->

## Visual Reference

### Solid and Subtle Variants

| Variant          | Preview                | Use Case                                   |
| ---------------- | ---------------------- | ------------------------------------------ |
| `default`        | ![Blue badge]          | Primary actions, default status            |
| `success`        | ![Green badge]         | Completed, approved, active                |
| `warning`        | ![Yellow badge]        | Pending, in progress, attention needed     |
| `error`          | ![Red badge]           | Failed, rejected, critical                 |
| `neutral`        | ![Gray badge]          | Draft, inactive, disabled                  |
| `info`           | ![Blue badge]          | Informational, new, in-progress            |
| `subtle-success` | ![Subtle green badge]  | Low-emphasis completed or matched statuses |
| `subtle-warning` | ![Subtle yellow badge] | Low-emphasis pending or attention states   |
| `subtle-error`   | ![Subtle red badge]    | Low-emphasis failures or exceptions        |
| `subtle-info`    | ![Subtle blue badge]   | Low-emphasis informational or in-progress  |
| `subtle-neutral` | ![Subtle gray badge]   | Low-emphasis tags with no status           |

### Outline Variants

| Variant           | Preview                 | Use Case                   |
| ----------------- | ----------------------- | -------------------------- |
| `outline-success` | ![Green dot + outline]  | Active, available, healthy |
| `outline-warning` | ![Orange dot + outline] | In progress, scheduled     |
| `outline-error`   | ![Red dot + outline]    | Error, unavailable, down   |
| `outline-info`    | ![Blue dot + outline]   | Information, processing    |
| `outline-neutral` | ![Gray dot + outline]   | Neutral state, inactive    |

## Accessibility

- Use semantic color meanings consistently (green = success, red = error, etc.)
- Don't rely solely on color to convey information
- Consider adding icons or text labels for clarity
- Badges are non-interactive: they render with the default cursor (not a pointer) and won't suggest clickability, even when placed inside a clickable container such as a `DataTable` row with `onClickRow`

## Usage in DescriptionCard

Badges can be used with DescriptionCard for automatic status rendering:

```tsx
import { DescriptionCard } from "@tailor-platform/app-shell";

<DescriptionCard
  data={orderData}
  fields={[
    {
      type: "badge",
      key: "status",
      label: "Status",
      meta: {
        sentenceCaseBadges: false,
        badgeVariantMap: {
          pending: "outline-warning",
          shipped: "outline-success",
          delivered: "success",
        },
      },
    },
  ]}
/>;
```

[Learn more about DescriptionCard →](./description-card.md)

## Best Practices

### Do:

- ✅ Use consistent variants for the same meaning across your app
- ✅ Keep badge text short (1-2 words)
- ✅ Use outline variants for subtle emphasis
- ✅ Use solid variants for important status indicators

### Don't:

- ❌ Use too many different badge colors (stick to semantic colors)
- ❌ Put long text in badges (use tooltips instead)
- ❌ Make badges clickable without visual indication
- ❌ Use badges for navigation (use links or buttons instead)

## Related Components

- [DescriptionCard](./description-card.md) - Use badges in structured displays
- [Layout](./layout.md) - Organize badges in layouts

## Styling

Badges are styled with the library's internal `astw:`-prefixed utilities. Write **plain** Tailwind utilities in your own markup, and reach for `variant` rather than restyling what `Badge` sets itself — see [Styling AppShell components](../concepts/styling-theming.md#styling-appshell-components). Customize appearance by:

1. **Using className prop** for additional styles
2. **Overriding CSS variables** in your theme
3. **Creating custom variants** using the `badgeVariants` utility

<!-- example: styling-utility -->
