---
"@tailor-platform/app-shell": minor
---

Add a `render` escape hatch to `DescriptionCard` fields, so custom rendering no longer requires a new built-in field type.

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
      render: (data) => <PieChart data={data.deliveryBreakdown} />,
    },
  ]}
/>
```

`render` receives the whole `data` object — the same shape as `render` on DataTable's `Column`, which takes the whole row. Destructure the keys you need, and a field can be derived from several at once:

```tsx
{
  key: "total",
  label: "Balance Due",
  render: ({ total, amountPaid, currency }) => (
    <Money amount={total - amountPaid} currency={currency} />
  ),
}
```

Semantics match DataTable's `render`: it always wins over `type`, and its return value replaces the built-in output entirely (so `meta` — copy button, truncation, badge maps, the `–` placeholder — is not applied). `key` is still required; it identifies the field and is what `emptyBehavior` tests, but it is not resolved into a value for `render`. A custom renderer still runs when the value at `key` is empty; `emptyBehavior: "hide"` is checked first.

`DescriptionCard` is now generic over the shape of `data`, inferred from the `data` prop, so everything `render` reaches for keeps its declared type. This is backward compatible — `DescriptionCardProps` defaults to `Record<string, unknown>`. To declare a fields array separately, parameterise it so `render` callbacks stay typed:

```tsx
const fields: DescriptionCardProps<Order>["fields"] = [...];
```
