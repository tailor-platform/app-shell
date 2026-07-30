---
title: Badge
description: Display status, labels, and tags with customizable variants
---

# Badge

The `Badge` component displays status indicators, labels, and tags with multiple style variants. It's commonly used to show document status, priority levels, or categorical information.

[Live preview in the UI Catalogue →](https://ui.tailor.tech/components/badge)

## Import

```tsx
import { Badge, type BadgeVariant, type BadgeOptions } from "@tailor-platform/app-shell";
```

## Basic Usage

```tsx
<Badge>Default</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="error">Error</Badge>
<Badge variant="info">Info</Badge>
<Badge variant="subtle-success">Subtle Success</Badge>
<Badge variant="subtle-warning">Subtle Warning</Badge>
<Badge variant="subtle-error">Subtle Error</Badge>
<Badge variant="subtle-info">Subtle Info</Badge>
```

## Variants

### Solid and Subtle Variants

Filled variants for high emphasis, plus subtle variants for lower-emphasis status labels:

```tsx
<Badge variant="default">Default</Badge>
<Badge variant="success">Approved</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Rejected</Badge>
<Badge variant="neutral">Draft</Badge>
<Badge variant="info">New</Badge>
<Badge variant="subtle-success">Matched</Badge>
<Badge variant="subtle-warning">Needs Attention</Badge>
<Badge variant="subtle-error">Needs Review</Badge>
<Badge variant="subtle-info">In Progress</Badge>
```

### Outline Variants with Status Dots

Outlined badges with colored status dots for subtle emphasis:

```tsx
<Badge variant="outline-success">Active</Badge>
<Badge variant="outline-warning">In Progress</Badge>
<Badge variant="outline-error">Failed</Badge>
<Badge variant="outline-info">Info</Badge>
<Badge variant="outline-neutral">Inactive</Badge>
```

## Props

| Prop        | Type              | Default     | Description            |
| ----------- | ----------------- | ----------- | ---------------------- |
| `variant`   | `BadgeVariant`    | `"default"` | Visual style variant   |
| `className` | `string`          | -           | Additional CSS classes |
| `children`  | `React.ReactNode` | -           | Badge content          |

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

```tsx
function OrderStatus({ status }: { status: string }) {
  const variantMap: Record<string, BadgeVariant> = {
    pending: "outline-warning",
    processing: "outline-info",
    shipped: "outline-success",
    delivered: "success",
    cancelled: "outline-error",
  };

  return <Badge variant={variantMap[status] || "neutral"}>{status.toUpperCase()}</Badge>;
}
```

### Priority Badges

```tsx
const priorities = [
  { label: "Low", variant: "outline-neutral" },
  { label: "Medium", variant: "outline-info" },
  { label: "High", variant: "outline-warning" },
  { label: "Critical", variant = "error" },
];

<div className="astw:flex astw:gap-2">
  {priorities.map((p) => (
    <Badge key={p.label} variant={p.variant}>
      {p.label}
    </Badge>
  ))}
</div>;
```

### With Icons

```tsx
import { CheckCircle, AlertCircle, XCircle } from "lucide-react";

<div className="astw:flex astw:gap-2">
  <Badge variant="success">
    <CheckCircle className="astw:w-3 astw:h-3 astw:mr-1" />
    Verified
  </Badge>
  <Badge variant="warning">
    <AlertCircle className="astw:w-3 astw:h-3 astw:mr-1" />
    Review
  </Badge>
  <Badge variant="error">
    <XCircle className="astw:w-3 astw:h-3 astw:mr-1" />
    Blocked
  </Badge>
</div>;
```

### Dynamic Variant Selection

```tsx
interface Product {
  name: string;
  stock: number;
}

function ProductBadge({ product }: { product: Product }) {
  // Determine variant based on stock level
  let variant: BadgeVariant = "success";
  if (product.stock === 0) {
    variant = "error";
  } else if (product.stock < 10) {
    variant = "warning";
  }

  return <Badge variant={variant}>{product.stock} in stock</Badge>;
}
```

### Custom Styling

```tsx
<Badge variant="success" className="astw:text-xs astw:px-3 astw:py-1 astw:uppercase">
  Premium
</Badge>
```

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

Badges use Tailwind CSS classes prefixed with `astw:`. Customize appearance by:

1. **Using className prop** for additional styles
2. **Overriding CSS variables** in your theme
3. **Creating custom variants** using the `badgeVariants` utility

```tsx
import { badgeVariants } from "@tailor-platform/app-shell";
import { cn } from "@/lib/utils";

<div className={cn(badgeVariants({ variant: "success" }), "astw:text-lg")}>Custom Badge</div>;
```
