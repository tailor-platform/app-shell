---
kind: code-backed
group: card
title: Card
description: General-purpose container with consistent styling using a compound component API
sources:
  - packages/core/src/components/card/**
---

# Card

`Card` is a general-purpose container component with a compound component API (`Card.Root`, `Card.Header`, `Card.Content`). It provides consistent surface styling (background, border, border-radius, shadow) for grouping related content.

## Import

```tsx
import { Card } from "@tailor-platform/app-shell";
```

## Basic Usage

<!-- example: basic-usage -->

## Parts

| Part           | Description                                                      |
| -------------- | ---------------------------------------------------------------- |
| `Card.Root`    | Outer container. Renders a `<div>` with surface styling applied. |
| `Card.Header`  | Top section with an optional title and description.              |
| `Card.Content` | Body section with consistent padding, or edge-to-edge.           |

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

| Prop        | Type                    | Default     | Description                                                                                    |
| ----------- | ----------------------- | ----------- | ---------------------------------------------------------------------------------------------- |
| `padding`   | `"default"` \| `"none"` | `"default"` | `"none"` renders the content edge-to-edge — see [Edge-to-edge content](#edge-to-edge-content). |
| `className` | `string`                | -           | Additional CSS classes                                                                         |
| `children`  | `React.ReactNode`       | -           | Card body content                                                                              |

## Edge-to-edge content

Use `padding="none"` when a `Table`, `DataTable` or divided list should meet the card's border instead of floating inside it:

<!-- example: edge-to-edge-table -->

Don't add padding back on the table. `Table.Head` and `Table.Cell` already inset their first and last cells by 24px, which lines the first column up with the card title.

Edge-to-edge content also:

- **Keeps row backgrounds inside the card's rounded corners.** A direct `Table` or `DataTable` child clips its row hover and pinned-cell backgrounds to the card's corners.
- **Removes a nested `DataTable`'s own border**, so it doesn't draw a box inside the card. Its toolbar and footer stay as they are:

```tsx
<Card.Root>
  <Card.Header title="Line items" />
  <Card.Content padding="none">
    <DataTable.Root value={table}>
      <DataTable.Table />
      <DataTable.Footer>
        <DataTable.Pagination />
      </DataTable.Footer>
    </DataTable.Root>
  </Card.Content>
</Card.Root>
```

For a scrollable list, put the overflow on `Card.Content`. Rows supply their own `px-6`, and dividers run to the card edges:

```tsx
<Card.Content padding="none" className="max-h-60 overflow-y-auto">
  <ul className="divide-y divide-border border-t border-border">
    {items.map((item) => (
      <li key={item.id} className="px-6 py-3">
        {item.name}
      </li>
    ))}
  </ul>
</Card.Content>
```

## Examples

### Header only

```tsx
<Card.Root>
  <Card.Header title="Summary" description="Key metrics for this period" />
</Card.Root>
```

### Content only

```tsx
<Card.Root>
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
  <Card.Content padding="none">
    <Table.Root>{/* ... */}</Table.Root>
  </Card.Content>
</Card.Root>
```

## Related

- [MetricCard](./metric-card.md) — Card variant for KPI / dashboard metric display.
- [DescriptionCard](./description-card.md) — Card variant for structured key-value data.
- [ActivityCard](./activity-card.md) — Card variant for timeline activity feeds.
