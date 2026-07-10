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
                  <Table.Head align="right">Qty</Table.Head>
                  <Table.Head align="right">Total</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {order.lineItems.map((item) => (
                  <Table.Row key={item.id}>
                    <Table.Cell>{item.sku}</Table.Cell>
                    <Table.Cell align="right">{item.qty}</Table.Cell>
                    <Table.Cell align="right">${item.total.toLocaleString()}</Table.Cell>
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
