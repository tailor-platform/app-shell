---
slug: pattern/detail/hero-with-actions
name: Hero With Actions Detail
category: pattern
subcategory: detail
description: Single-record detail view with workflow actions and activity timeline
requiredImports:
  [Layout, Badge, Button, Menu, DescriptionCard, Card, Table, ActionPanel, ActivityCard]
tags: [detail, actions, timeline, workflow, two-column]
do:
  - Single-record detail view (Order #1234, Supplier ABC, Product SKU-42)
  - Record has a workflow with named actions (Approve, Cancel, Ship)
  - An activity/audit history is meaningful to surface
dont:
  - The page primarily compares two grids or record sets (match/reconcile)
  - The record is purely informational with no actions and no history — use list/dense-scan row click into a sheet instead
---

# pattern/detail/hero-with-actions

## When to Use

- Single-record detail view (Order #1234, Supplier ABC, Product SKU-42)
- Record has a workflow with named actions (Approve, Cancel, Ship)
- An activity/audit history is meaningful to surface

## Layout

```
+---------------------------------------------------------+
| Layout.Header  title  [Badge]            [Primary CTA]  |
+----------------------------------+----------------------+
| Layout.Column (main)             | Layout.Column right  |
|  DescriptionCard  Summary        |  ActionPanel         |
|   - field : value                |   - Approve          |
|   - field : value                |   - Cancel           |
|  Card  Attachments               |                      |
|   - file rows                    |  ActivityCard        |
|  Card  Line items                |   - history entry    |
|   inline Table.Root              |   - history entry    |
|                                  |  (…N more side cards |
|                                  |   per use case)      |
+----------------------------------+----------------------+
```

Composition rules:

- Both columns accept N cards based on the use case — add as many sections as the record requires.
- Each main-column section sits in a `Card` container — except `DescriptionCard`, which already provides its own container and must not be double-wrapped in a `Card`.
- Right-column cards (`ActionPanel`, `ActivityCard`, related summaries, etc.) are composed the same way. `ActionPanel` and `ActivityCard` are the most common; neither is mandatory.

Responsive: <1024 collapses to single column with right column rendered below main; 1024–1280 two columns with narrow side; >1280 two columns at full width.

## Page Implementation

```tsx
/* pattern: detail/hero-with-actions */
import {
  Layout,
  Badge,
  Button,
  Card,
  DescriptionCard,
  Table,
  ActionPanel,
  ActivityCard,
} from "@tailor-platform/app-shell";
import type { Order } from "./mock";

type Props = {
  order: Order;
  onApprove: () => void;
  onCancel: () => void;
};

export default function HeroWithActionsDetail({ order, onApprove, onCancel }: Props) {
  return (
    <Layout>
      <Layout.Header
        title={`Order ${order.number}`}
        actions={[
          <Badge key="status" variant="success">
            {order.status}
          </Badge>,
          <Button key="edit">Edit</Button>,
        ]}
      />
      <Layout.Column>
        <DescriptionCard
          title="Summary"
          data={order}
          columns={3}
          fields={[
            { key: "number", label: "Order number" },
            {
              key: "status",
              label: "Status",
              type: "badge",
              meta: { badgeVariantMap: { Confirmed: "success", Draft: "neutral" } },
            },
            { key: "customer", label: "Customer" },
            { key: "total", label: "Total" },
          ]}
        />
        <Card.Root>
          <Card.Header title="Line items" />
          <Card.Content className="astw:px-0">
            <Table.Root containerClassName="astw:px-6">
              <Table.Header>
                <Table.Row>
                  <Table.Head>SKU</Table.Head>
                  <Table.Head>Qty</Table.Head>
                  <Table.Head>Total</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {order.lineItems.map((item) => (
                  <Table.Row key={item.id}>
                    <Table.Cell>{item.sku}</Table.Cell>
                    <Table.Cell>{item.qty}</Table.Cell>
                    <Table.Cell>${item.total.toLocaleString()}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Card.Content>
        </Card.Root>
      </Layout.Column>
      <Layout.Column area="right">
        <ActionPanel
          title="Actions"
          actions={[
            { key: "approve", label: "Approve", icon: <span>✓</span>, onClick: onApprove },
            { key: "cancel", label: "Cancel", icon: <span>✕</span>, onClick: onCancel },
          ]}
        />
        <ActivityCard title="Activity" items={order.activities} />
      </Layout.Column>
    </Layout>
  );
}
```

## Constraints

- More than 2 primary actions in the header → move overflow into a `Menu`.
- Every content section MUST sit inside `Card.Root` (or `DescriptionCard`, which already self-contains). Raw divs are not allowed.
- `ActionPanel` is workflow-only — never back-navigation.
- `Table.Root` inside a Card requires `containerClassName="astw:px-6"`.

## Anti-patterns

- No status `Badge` on stateful entities — users can't tell where the record is in its lifecycle.
- `ActionPanel` mixed with metadata in the same card — keep workflow separate from descriptive fields.
- Bare `<div>` sections in the main column — every content section MUST sit inside `Card.Root`.
- `ActionPanel` containing back-navigation (e.g. "Back to Product List") — back navigation lives in `Layout.Header`'s breadcrumb.
- A `Table.Root` inside a Card without `containerClassName="astw:px-6"` — the first column lands flush against the card edge.
