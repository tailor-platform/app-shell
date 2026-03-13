---
title: ActionPanel
description: Display a title and a vertical list of actions with per-row loading and disabled states
---

# ActionPanel

`ActionPanel` is a presentational card component for rendering a vertical list of actions (icon + label). It is designed for ERP detail pages and side panels where available actions are often backend-driven.

## Import

```tsx
import { ActionPanel } from "@tailor-platform/app-shell";
```

## Basic Usage

```tsx
<ActionPanel
  title="Actions"
  actions={[
    {
      key: "create-invoice",
      label: "Create new sales invoice",
      icon: <ReceiptIcon />,
      onClick: () => openCreateInvoiceModal(),
    },
    {
      key: "view-docs",
      label: "View documentation",
      icon: <ExternalLinkIcon />,
      onClick: () => window.open("/docs", "_blank", "noopener,noreferrer"),
    },
  ]}
/>
```

## Props

### ActionPanel Props

| Prop        | Type           | Default      | Description                              |
| ----------- | -------------- | ------------ | ---------------------------------------- |
| `title`     | `string`       | **Required** | Card title (for example, `"Actions"`)    |
| `actions`   | `ActionItem[]` | **Required** | List of actions to render                |
| `className` | `string`       | -            | Additional CSS classes for the card root |

### ActionItem

| Property   | Type                          | Default      | Description                                        |
| ---------- | ----------------------------- | ------------ | -------------------------------------------------- |
| `key`      | `string`                      | **Required** | Unique key for stable rendering                    |
| `label`    | `string`                      | **Required** | Action label shown to users                        |
| `icon`     | `ReactNode`                   | **Required** | Icon rendered in a fixed 16px slot                |
| `onClick`  | `() => void \| Promise<void>` | -            | Click handler for the action                       |
| `disabled` | `boolean`                     | `false`      | Disables interaction and applies disabled styling  |
| `loading`  | `boolean`                     | `false`      | Shows spinner, disables interaction, sets busy UI  |

## Behavior

- Rows are rendered as `<button type="button">` elements.
- `disabled` or `loading` makes the row non-interactive.
- When `loading` is `true`, the icon slot renders a spinner without shifting layout.
- Empty actions show a built-in fallback message: `No actions available`.

## With Loading State

Use parent state to control which row is loading:

```tsx
const [loadingKey, setLoadingKey] = useState<string | null>(null);

const handleConfirm = async () => {
  setLoadingKey("confirm");
  try {
    await confirmOrder(orderId);
  } finally {
    setLoadingKey(null);
  }
};

<ActionPanel
  title="Actions"
  actions={[
    {
      key: "confirm",
      label: "Confirm order",
      icon: <CheckIcon />,
      onClick: handleConfirm,
      loading: loadingKey === "confirm",
    },
  ]}
/>;
```

## Backend-Driven Pattern

In ERP apps, the backend often decides which actions are available for a document. A common setup:

1. Backend returns document data and available action keys.
2. Frontend maps each key to a registry entry (`label`, `icon`, `execute`).
3. Page builds `ActionItem[]` and wires `onClick`.
4. Page controls `loading` per key and passes it to `ActionPanel`.

This keeps `ActionPanel` simple and reusable across entity types.

## Accessibility

- Action list uses `role="list"` and each row wrapper uses `role="listitem"`.
- Buttons are keyboard accessible and include focus-visible states.
- Loading rows set `aria-busy="true"`.
- Disabled rows set `aria-disabled="true"` and native `disabled`.

## Styling

The component uses Tailwind classes with the `astw:` prefix:

- Full width card (`astw:w-full`)
- Compact spacing for dense action lists
- Fixed icon slot for stable alignment
- Inline spinner for loading state

Use `className` on `ActionPanel` to add or override card-level styles.

## Examples in This Repo

- `examples/app-module` includes an **Action Panel Demo** resource.
- The **2 Columns** layout page also includes an ActionPanel with loading behavior.

## Related Components

- [Layout](./layout.md) - Compose page-level column layouts
- [DescriptionCard](./description-card.md) - Display structured record fields
- [Badge](./badge.md) - Show statuses and semantic labels

## Related Concepts

- [Modules and Resources](../concepts/modules-and-resources.md) - Organize pages and routes
- [Routing and Navigation](../concepts/routing-navigation.md) - Navigation patterns
