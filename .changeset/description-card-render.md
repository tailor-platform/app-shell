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
    { key: "deliveryBreakdown", label: "Delivery", render: (value) => <PieChart data={value} /> },
  ]}
/>
```

`render` receives the resolved value at `key` (dot notation applied) plus the full `data` object, so a field can be derived from several keys at once:

```tsx
{
  key: "amountPaid",
  label: "Balance Due",
  render: (value, data) => formatMoney(data.total - data.amountPaid, data.currency),
}
```

This matches `render` on DataTable's `Column`: it always wins over `type`, and its return value replaces the built-in output entirely (so `meta` — copy button, truncation, badge maps, the `–` placeholder — is not applied). It is still called for empty values; `emptyBehavior: "hide"` is checked first.

`DescriptionCard` is now generic over the shape of `data`, which is inferred from the `data` prop and types `render`'s second argument. This is backward compatible — `DescriptionCardProps` defaults to `Record<string, unknown>`. To declare a fields array separately, parameterise it so `render` callbacks stay typed:

```tsx
const fields: DescriptionCardProps<Order>["fields"] = [...];
```
