---
kind: code-backed
group: description-card
title: DescriptionCard
description: Display structured key-value information in a responsive grid layout with automatic field rendering
sources:
  - packages/core/src/components/description-card/**
---

# DescriptionCard

`DescriptionCard` is a powerful component for displaying structured document information in ERP applications. It automatically renders field-value pairs in a responsive grid with support for multiple field types, dividers, and smart empty value handling.

## Import

```tsx
import { DescriptionCard } from "@tailor-platform/app-shell";
```

## Basic Usage

<!-- example: basic-usage -->

<!-- api -->

## Field Types

### text (default)

Plain text display with optional truncation and copy button.

```tsx
{
  key: "description",
  label: "Description",
  type: "text", // or omit - it's the default
  meta: {
    copyable: true,
    truncateLines: 3, // Show "..." after 3 lines with tooltip
  },
}
```

### badge

Displays value as a Badge component with variant mapping. Accepts a single value or an array of values.

```tsx
{
  key: "status",
  label: "Status",
  type: "badge",
  meta: {
    sentenceCaseBadges: false, // Optional: render the original value instead
    badgeVariantMap: {
      draft: "neutral",
      pending: "subtle-warning",
      approved: "subtle-success",
      shipped: "success",
      cancelled: "subtle-error",
    },
  },
}
```

Badge values are rendered in sentence case by default. Set `meta.sentenceCaseBadges` to `false` when you need to display the original value from your data.

#### Array badges with overflow

When the field value is an array, each item is rendered as a separate badge. Use `maxVisible` to cap the number shown — extra items appear in a hover popover:

<!-- example: array-badges -->

### money

Formats currency values with proper locale formatting.

```tsx
{
  key: "amount",
  label: "Amount",
  type: "money",
  meta: {
    currencyKey: "currency", // Path to currency code in data
  },
}

// Data: { amount: 1234.56, currency: "USD" }
// Renders: $1,234.56
```

Set `meta.currencySign` to `"accounting"` to use locale-specific accounting notation for negative amounts, such as `($1,234.56)` for USD in `en-US`. The default is `"standard"`, which uses a minus sign.

```tsx
{
  key: "amount",
  label: "Amount",
  type: "money",
  meta: {
    currencyKey: "currency",
    currencySign: "accounting",
  },
}

// Data: { amount: -1234.56, currency: "USD" }
// Renders in en-US: ($1,234.56)
```

Money formatting uses the environment's locale. The default currency key is `"currency"`; missing currency codes fall back to USD. Invalid currency codes retain the existing plain-text fallback rather than applying accounting notation.

### date

Formats date/time values with multiple format options.

```tsx
{
  key: "createdAt",
  label: "Created",
  type: "date",
  meta: {
    dateFormat: "medium", // "short" | "medium" | "long" | "relative"
  },
}
```

Format examples:

- `short`: 3/6/2026
- `medium`: Mar 6, 2026
- `long`: March 6, 2026 at 2:30 PM
- `relative`: 2 hours ago / In 3 days

Relative dates support both past and future values and are automatically localized based on the AppShell locale (English and Japanese are built in).

### link

Renders a clickable link.

```tsx
{
  key: "customerName",
  label: "Customer",
  type: "link",
  meta: {
    hrefKey: "customerUrl", // Path to URL in data
    external: true, // Opens in new tab
  },
}
```

Internal links (when `external` is not set or `false`) use react-router `<Link>` for client-side navigation. External links (when `external: true`) open in a new tab using a standard `<a>` tag.

### address

Formats multi-line address display.

```tsx
{
  key: "shippingAddress",
  label: "Shipping Address",
  type: "address",
}

// Data: {
//   shippingAddress: {
//     street: "123 Main St",
//     city: "San Francisco",
//     state: "CA",
//     zip: "94105",
//   }
// }
```

### reference

Links to related documents with auto-generated URLs using react-router `<Link>` for client-side navigation.

```tsx
{
  key: "invoiceNumber",
  label: "Invoice",
  type: "reference",
  meta: {
    referenceIdKey: "invoiceId",
    referenceUrlPattern: "/invoices/{id}",
  },
}
```

## Custom Rendering

When no built-in `type` fits, pass `render` to draw the field yourself. It receives the whole `data` object — reach into it for whatever the field needs:

```tsx
<DescriptionCard
  data={orderData}
  title="Order"
  fields={[
    { key: "orderNumber", label: "Order Number" }, // default text
    { key: "status", label: "Status", type: "badge" }, // preset
    {
      key: "deliveryBreakdown",
      label: "Delivery",
      render: (data) => <PieChart data={data.deliveryBreakdown} />, // fully custom
    },
  ]}
/>
```

Because `render` takes the whole object, a field can be derived from several keys at once — destructure the ones you want:

```tsx
{
  key: "total",
  label: "Balance Due",
  render: ({ total, amountPaid, currency }) => (
    <Money amount={total - amountPaid} currency={currency} />
  ),
}
```

This is the same convention as [DataTable's](./data-table.md) column `render`, which also receives the whole row, so the two data-display components behave alike. It also means everything you touch keeps its declared type — nothing is widened to `unknown`.

### Rules

- **`render` always wins over `type`.** Both may be set, but the built-in renderer is skipped entirely.
- **`meta` is not applied.** A custom renderer owns its own presentation — the copy button, truncation, badge maps, and the `–` empty placeholder are all built-in behaviour that `render` replaces. Render them yourself if you want them.
- **`key` is still required.** It identifies the field and is what `emptyBehavior` tests. It does _not_ pre-resolve a value for `render` — dot-notation paths are only used by the built-in `type` renderers.
- **`render` still runs when the value at `key` is empty,** so you decide how to display that. `emptyBehavior: "hide"` is checked first and removes the field before `render` is called.

## Dividers

Use dividers to visually separate field groups:

```tsx
<DescriptionCard
  data={data}
  fields={[
    { key: "orderNumber", label: "Order Number" },
    { key: "customer", label: "Customer" },
    { type: "divider" }, // Creates a horizontal line
    { key: "status", label: "Status", type: "badge" },
    { key: "totalAmount", label: "Total", type: "money" },
  ]}
/>
```

## Empty Value Behavior

Control what displays when a field value is empty:

```tsx
{
  key: "notes",
  label: "Notes",
  emptyBehavior: "dash", // Shows "-" when empty (default)
}

{
  key: "optionalField",
  label: "Optional",
  emptyBehavior: "hide", // Hides the entire field when empty
}
```

## Nested Data Access

Use dot notation to access nested properties:

<!-- example: nested-data -->

## Column Layouts

Choose between 2, 3, or 4 column layouts:

```tsx
// 2 columns (better for mobile)
<DescriptionCard columns={2} data={data} fields={fields} />

// 3 columns (default, balanced)
<DescriptionCard columns={3} data={data} fields={fields} />

// 4 columns (more compact)
<DescriptionCard columns={4} data={data} fields={fields} />
```

The component is fully responsive:

- **Mobile (< 400px)**: 1 column
- **Tablet (400-600px)**: 2 columns
- **Desktop (600-800px)**: 3 columns
- **Large (> 800px)**: 4 columns (if `columns={4}`)

## Complete Example

<!-- example: complete-example -->

## Styling

The component uses container queries for responsive layouts:

`className` lands on the card root, for properties the card doesn't set itself — sizing and placement rather than surface. It manages its own background, radius, elevation and 24px content inset.

```tsx
<DescriptionCard className="max-w-3xl" data={data} fields={fields} />
```

Write **plain** Tailwind utilities here — see [Styling AppShell components](../concepts/styling-theming.md#styling-appshell-components).

## Accessibility

- Proper semantic HTML structure
- Labels associated with values
- Keyboard accessible copy buttons
- Tooltips for truncated content
- Screen reader friendly

## Best Practices

### Do:

- ✅ Group related fields with dividers
- ✅ Use appropriate field types for data
- ✅ Enable `copyable` for IDs and codes
- ✅ Use `emptyBehavior: "hide"` for optional fields
- ✅ Provide `badgeVariantMap` for status fields

### Don't:

- ❌ Put too many fields (consider splitting into tabs)
- ❌ Use more than 4 columns (hard to read)
- ❌ Mix unrelated data without dividers
- ❌ Forget to handle nested data properly

## TypeScript

`DescriptionCard` is generic over the shape of `data`, which is normally inferred:

```typescript
import { DescriptionCard, type DescriptionCardProps } from "@tailor-platform/app-shell";

// Define your data type
interface Order {
  orderNumber: string;
  customer: string;
  status: "draft" | "pending" | "shipped";
  total: number;
  currency: string;
}

declare const orderData: Order;

// `data` inside render is typed as Order - no annotation needed
<DescriptionCard
  data={orderData}
  title="Order"
  fields={[
    { key: "orderNumber", label: "Order" },
    { key: "status", label: "Status", type: "badge" },
    { key: "total", label: "Total", render: (data) => `${data.total} ${data.currency}` },
  ]}
/>;
```

To declare the fields array separately, parameterise `DescriptionCardProps` with your data type so `render` callbacks stay typed:

```typescript
const fields: DescriptionCardProps<Order>["fields"] = [
  { key: "orderNumber", label: "Order" },
  { key: "total", label: "Total", render: (data) => `${data.total} ${data.currency}` },
];

<DescriptionCard<Order> data={orderData} title="Order" fields={fields} />;
```

`render` receives `data` typed as your data type, so every key you reach for keeps its declared type. `key` remains a plain `string` accepting dot-notation paths, but it only feeds the built-in `type` renderers — it is not resolved and handed to `render`.

## Related Components

- [Badge](./badge.md) - Used for status fields
- [Layout](./layout.md) - Page layout container

## Related Concepts

- [Styling and Theming](../concepts/styling-theming.md) - Customize appearance
