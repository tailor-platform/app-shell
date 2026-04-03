---
title: Card
description: General-purpose container with consistent styling using a compound component API
---

# Card

`Card` is a general-purpose container component with a compound component API (`Card.Root`, `Card.Header`, `Card.Content`). It provides consistent surface styling (background, border, border-radius, shadow) for grouping related content.

## Import

```tsx
import { Card } from "@tailor-platform/app-shell";
```

## Basic Usage

```tsx preview
import { Card } from "@tailor-platform/app-shell";

<Card.Root style={{ flex: 1 }}>
  <Card.Header title="Order Details" description="Summary of order #1234" />
  <Card.Content>
    <p>Content goes here</p>
  </Card.Content>
</Card.Root>
```

## Parts

| Part           | Description                                                      |
| -------------- | ---------------------------------------------------------------- |
| `Card.Root`    | Outer container. Renders a `<div>` with surface styling applied. |
| `Card.Header`  | Top section with an optional title and description.              |
| `Card.Content` | Body section with consistent horizontal and bottom padding.      |

## Card.Root Props

`Card.Root` accepts all standard HTML `<div>` props.

| Prop        | Type              | Default | Description            |
| ----------- | ----------------- | ------- | ---------------------- |
| `className` | `string`          | -       | Additional CSS classes |
| `children`  | `React.ReactNode` | -       | Card parts and content |

## Card.Header Props

| Prop          | Type              | Default | Description                                                 |
| ------------- | ----------------- | ------- | ----------------------------------------------------------- |
| `title`       | `React.ReactNode` | -       | Card title rendered in a `<h3>`.                            |
| `description` | `React.ReactNode` | -       | Supplementary text rendered below the title.                |
| `children`    | `React.ReactNode` | -       | Additional header content rendered after title/description. |
| `className`   | `string`          | -       | Additional CSS classes.                                     |

## Card.Content Props

`Card.Content` accepts all standard HTML `<div>` props.

| Prop        | Type              | Default | Description            |
| ----------- | ----------------- | ------- | ---------------------- |
| `className` | `string`          | -       | Additional CSS classes |
| `children`  | `React.ReactNode` | -       | Card body content      |

## Examples

### Header only

```tsx preview
import { Card } from "@tailor-platform/app-shell";

<Card.Root style={{ flex: 1 }}>
  <Card.Header title="Summary" description="Key metrics for this period" />
</Card.Root>
```

### Content only

```tsx preview
import { Card } from "@tailor-platform/app-shell";

<Card.Root style={{ flex: 1 }}>
  <Card.Content>
    <p>No header needed for this card.</p>
  </Card.Content>
</Card.Root>
```

### Custom header content

```tsx
<Card.Root>
  <Card.Header title="Recent Orders">
    <Button size="sm" variant="outline">
      View all
    </Button>
  </Card.Header>
  <Card.Content>
    <Table>{/* ... */}</Table>
  </Card.Content>
</Card.Root>
```

## Related

- [MetricCard](./metric-card.md) — Card variant for KPI / dashboard metric display.
- [DescriptionCard](./description-card.md) — Card variant for structured key-value data.
- [ActivityCard](./activity-card.md) — Card variant for timeline activity feeds.
