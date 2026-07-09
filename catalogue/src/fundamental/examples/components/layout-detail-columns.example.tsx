import {
  ActionPanel,
  ActivityCard,
  Button,
  DescriptionCard,
  Layout,
} from "@tailor-platform/app-shell";

const order = {
  number: "PO-1234",
  supplier: "Supplier ABC",
  status: "Confirmed",
  createdAt: "2026-07-09",
};

const items = [
  {
    id: "1",
    actor: { name: "Hanna" },
    description: "approved this order",
    timestamp: new Date("2026-07-09T09:00:00Z"),
  },
  {
    id: "2",
    description: "created this order",
    timestamp: new Date("2026-07-08T15:16:00Z"),
  },
];

const dot = <span aria-hidden="true" className="size-2 rounded-full bg-current" />;

export function LayoutDetailColumnsExample() {
  return (
    <Layout>
      <Layout.Header
        title={order.number}
        actions={[
          <Button key="edit" variant="outline">
            Edit
          </Button>,
        ]}
      />
      <Layout.Column area="main">
        <DescriptionCard
          title="Order details"
          data={order}
          columns={3}
          fields={[
            { key: "number", label: "Order number" },
            { key: "supplier", label: "Supplier" },
            {
              key: "status",
              label: "Status",
              type: "badge",
              meta: { badgeVariantMap: { Confirmed: "success" } },
            },
            { key: "createdAt", label: "Created", type: "date", meta: { dateFormat: "short" } },
          ]}
        />
      </Layout.Column>
      <Layout.Column area="right">
        <ActionPanel
          title="Actions"
          actions={[
            { key: "approve", label: "Approve", icon: dot, variant: "default", onClick: () => {} },
            {
              key: "cancel",
              label: "Cancel",
              icon: dot,
              variant: "destructive",
              onClick: () => {},
            },
          ]}
        />
        <ActivityCard items={items} title="Updates" />
      </Layout.Column>
    </Layout>
  );
}
