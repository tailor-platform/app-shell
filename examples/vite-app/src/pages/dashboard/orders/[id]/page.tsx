import {
  useParams,
  Link,
  Button,
  Layout,
  DescriptionCard,
  ActionPanel,
  type AppShellPageProps,
} from "@tailor-platform/app-shell";
import { paths } from "../../../../routes.generated";

const PrintIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" />
    <rect x="6" y="14" width="12" height="8" rx="1" />
  </svg>
);

const CopyIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

const ArchiveIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="20" height="5" x="2" y="3" rx="1" />
    <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
    <path d="M10 12h4" />
  </svg>
);

const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();

  const orderData = {
    orderId: id,
    status: "processing",
    customer: "Acme Corporation",
    totalAmount: 3450.0,
    currency: "USD",
    createdAt: "2026-03-15T10:30:00Z",
  };

  return (
    <Layout>
      <Layout.Header
        title={`Order: ${id}`}
        actions={[
          <Button
            key="back"
            variant="outline"
            render={<Link to={paths.for("/dashboard/orders")} />}
          >
            ← Back to Orders
          </Button>,
        ]}
      />
      <Layout.Column>
        <DescriptionCard
          data={orderData}
          columns={2}
          fields={[
            { key: "orderId", label: "Order ID", meta: { copyable: true } },
            {
              key: "status",
              label: "Status",
              type: "badge",
              meta: {
                badgeVariantMap: {
                  processing: "outline-warning",
                  shipped: "outline-info",
                  delivered: "success",
                },
              },
            },
            { key: "customer", label: "Customer" },
            {
              key: "totalAmount",
              label: "Total",
              type: "money",
              meta: { currencyKey: "currency" },
            },
            {
              key: "createdAt",
              label: "Created",
              type: "date",
              meta: { dateFormat: "medium" },
            },
          ]}
        />
      </Layout.Column>
      <Layout.Column>
        <ActionPanel
          title="Actions"
          actions={[
            {
              key: "print",
              label: "Print order",
              icon: <PrintIcon />,
              onClick: () => window.print(),
            },
            {
              key: "duplicate",
              label: "Duplicate order",
              icon: <CopyIcon />,
              onClick: () => {},
            },
            {
              key: "archive",
              label: "Archive order",
              icon: <ArchiveIcon />,
              onClick: () => {},
            },
          ]}
        />
      </Layout.Column>
    </Layout>
  );
};

OrderDetailPage.appShellPageProps = {
  meta: {
    title: "Order Detail",
  },
} satisfies AppShellPageProps;

export default OrderDetailPage;
