---
title: DescriptionCard
description: Display structured key-value information in a responsive grid layout with automatic field rendering
---

# DescriptionCard

`DescriptionCard` is a powerful component for displaying structured document information in ERP applications. It automatically renders field-value pairs in a responsive grid with support for multiple field types, dividers, and smart empty value handling.

## Import

```tsx
import { DescriptionCard } from "@tailor-platform/app-shell";
```

## Basic Usage

```tsx
const orderData = {
  orderNumber: "ORD-12345",
  customer: "Acme Corporation",
  status: "shipped",
  totalAmount: 15750.00,
  currency: "USD",
  orderDate: "2026-03-01T10:00:00Z",
};

<DescriptionCard
  data={orderData}
  fields={[
    { key: "orderNumber", label: "Order Number" },
    { key: "customer", label: "Customer" },
    { key: "status", label: "Status", type: "badge" },
    { key: "totalAmount", label: "Total", type: "money", meta: { currencyKey: "currency" } },
    { key: "orderDate", label: "Order Date", type: "date" },
  ]}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `Record<string, unknown>` | **Required** | Data object containing field values |
| `fields` | `FieldConfig[]` | **Required** | Array of field configurations or dividers |
| `columns` | `2 \| 3 \| 4` | `3` | Number of columns in the grid |
| `className` | `string` | - | Additional CSS classes |

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

Displays value as a Badge component with variant mapping.

```tsx
{
  key: "status",
  label: "Status",
  type: "badge",
  meta: {
    badgeVariantMap: {
      draft: "neutral",
      pending: "outline-warning",
      approved: "outline-success",
      shipped: "success",
      cancelled: "outline-error",
    },
  },
}
```

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
- `relative`: 2 hours ago

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

Links to related documents with auto-generated URLs.

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

```tsx
const data = {
  customer: {
    name: "Acme Corp",
    contact: {
      email: "contact@acme.com",
    },
  },
};

<DescriptionCard
  data={data}
  fields={[
    { key: "customer.name", label: "Customer Name" },
    { key: "customer.contact.email", label: "Email" },
  ]}
/>
```

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

```tsx
import { DescriptionCard } from "@tailor-platform/app-shell";

const orderData = {
  // Order info
  orderNumber: "ORD-12345",
  orderDate: "2026-03-01T10:00:00Z",
  status: "shipped",

  // Customer
  customer: {
    name: "Acme Corporation",
    id: "CUST-001",
    email: "orders@acme.com",
  },

  // Financial
  subtotal: 14000.00,
  tax: 1750.00,
  total: 15750.00,
  currency: "USD",

  // Shipping
  shippingAddress: {
    street: "123 Business Ave",
    city: "San Francisco",
    state: "CA",
    zip: "94105",
  },
  trackingNumber: "1Z999AA10123456784",

  // Notes
  notes: "Rush delivery requested",
};

function OrderDetails() {
  return (
    <DescriptionCard
      data={orderData}
      columns={3}
      fields={[
        // Order Information
        {
          key: "orderNumber",
          label: "Order Number",
          meta: { copyable: true },
        },
        {
          key: "orderDate",
          label: "Order Date",
          type: "date",
          meta: { dateFormat: "medium" },
        },
        {
          key: "status",
          label: "Status",
          type: "badge",
          meta: {
            badgeVariantMap: {
              draft: "neutral",
              pending: "outline-warning",
              shipped: "outline-success",
              delivered: "success",
              cancelled: "outline-error",
            },
          },
        },

        { type: "divider" },

        // Customer Information
        {
          key: "customer.name",
          label: "Customer",
          type: "reference",
          meta: {
            referenceIdKey: "customer.id",
            referenceUrlPattern: "/customers/{id}",
          },
        },
        {
          key: "customer.email",
          label: "Email",
          type: "link",
          meta: { hrefKey: "customer.email" },
        },

        { type: "divider" },

        // Financial
        {
          key: "subtotal",
          label: "Subtotal",
          type: "money",
          meta: { currencyKey: "currency" },
        },
        {
          key: "tax",
          label: "Tax",
          type: "money",
          meta: { currencyKey: "currency" },
        },
        {
          key: "total",
          label: "Total",
          type: "money",
          meta: { currencyKey: "currency" },
        },

        { type: "divider" },

        // Shipping
        {
          key: "shippingAddress",
          label: "Shipping Address",
          type: "address",
        },
        {
          key: "trackingNumber",
          label: "Tracking",
          meta: { copyable: true },
        },

        { type: "divider" },

        // Notes
        {
          key: "notes",
          label: "Notes",
          meta: { truncateLines: 2 },
          emptyBehavior: "hide",
        },
      ]}
    />
  );
}
```

## Styling

The component uses container queries for responsive layouts:

```tsx
// Custom styling
<DescriptionCard
  className="astw:bg-white astw:p-6 astw:rounded-lg astw:shadow"
  data={data}
  fields={fields}
/>
```

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

Full type safety with TypeScript:

```typescript
import { type DescriptionCardProps } from "@tailor-platform/app-shell";

// Define your data type
interface Order {
  orderNumber: string;
  customer: string;
  status: "draft" | "pending" | "shipped";
  total: number;
  currency: string;
}

// Type-safe field definitions
const fields: DescriptionCardProps["fields"] = [
  { key: "orderNumber", label: "Order" },
  { key: "status", label: "Status", type: "badge" },
  // ... more fields
];

<DescriptionCard<Order> data={orderData} fields={fields} />
```

## Related Components

- [Badge](./badge.md) - Used for status fields
- [Layout](./layout.md) - Page layout container

## Related Concepts

- [Styling and Theming](../concepts/styling-theming.md) - Customize appearance
