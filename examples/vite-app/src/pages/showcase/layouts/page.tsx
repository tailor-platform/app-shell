import * as React from "react";
import {
  ActivityCard,
  ActionPanel,
  Button,
  DescriptionCard,
  Layout,
  useNavigate,
  type AppShellPageProps,
} from "@tailor-platform/app-shell";
import { ExternalLink, FileText, LayoutPanelTop, Receipt } from "lucide-react";

const mockPurchaseOrder = {
  docNumber: "PO-10000041",
  externalReference: "P00594",
  supplierName: "Acme Industrial Supplies",
  expectedDeliveryDate: "2024-02-15T00:00:00Z",
  confirmedAt: "2024-01-21T09:00:00Z",
  createdAt: "2024-01-20T10:30:00Z",
  shipToLocation: {
    name: "Main Warehouse",
    address: {
      line1: "1234 Industrial Blvd",
      line2: "Building C",
      city: "Austin",
      state: "TX",
      zip: "78701",
      country: "United States",
    },
  },
  note: "Rush order - priority shipping requested.",
};

const activityItems = [
  {
    id: "1",
    actor: { name: "Hanna" },
    description: "changed the status from DRAFT to CONFIRMED",
    timestamp: new Date("2025-03-21T09:00:00"),
  },
  {
    id: "2",
    actor: { name: "Pradeep Kumar" },
    description: "created this PO",
    timestamp: new Date("2025-03-21T15:16:00"),
  },
  {
    id: "3",
    description: "sent confirmation email",
    timestamp: new Date("2025-03-20T10:00:00"),
  },
];

const Placeholder = ({ columnNumber }: { columnNumber: number }) => (
  <div
    className="astw:rounded-md astw:border astw:border-border astw:bg-muted astw:flex astw:items-center astw:justify-center astw:relative astw:overflow-hidden"
    style={{ minHeight: 260, height: 260 }}
  >
    <div
      className="astw:absolute astw:inset-0 astw:opacity-30 dark:astw:opacity-20"
      style={{
        backgroundImage: `repeating-linear-gradient(
          135deg,
          transparent,
          transparent 8px,
          rgba(0, 0, 0, 0.1) 8px,
          rgba(0, 0, 0, 0.1) 9px
        )`,
      }}
    />
    <div
      className="astw:absolute astw:inset-0 astw:opacity-0 dark:astw:opacity-20"
      style={{
        backgroundImage: `repeating-linear-gradient(
          135deg,
          transparent,
          transparent 8px,
          rgba(255, 255, 255, 0.1) 8px,
          rgba(255, 255, 255, 0.1) 9px
        )`,
      }}
    />
    <span className="astw:text-4xl astw:font-bold astw:text-muted-foreground astw:relative astw:z-10">
      {columnNumber}
    </span>
  </div>
);

const orderOverviewFields = [
  { key: "docNumber", label: "PO Number", meta: { copyable: true } },
  { key: "externalReference", label: "External Ref", meta: { copyable: true } },
  { key: "supplierName", label: "Supplier" },
  { type: "divider" as const },
  {
    key: "expectedDeliveryDate",
    label: "Expected Delivery",
    type: "date" as const,
    meta: { dateFormat: "medium" as const },
  },
  {
    key: "confirmedAt",
    label: "Confirmed",
    type: "date" as const,
    meta: { dateFormat: "medium" as const },
  },
  {
    key: "createdAt",
    label: "Created",
    type: "date" as const,
    meta: { dateFormat: "relative" as const },
  },
  { key: "shipToLocation.name", label: "Warehouse" },
  { type: "divider" as const },
  {
    key: "shipToLocation.address",
    label: "Shipping Address",
    type: "address" as const,
    meta: { copyable: true },
  },
  { key: "note", label: "Notes", meta: { truncateLines: 3 } },
];

const layoutHeaderActions = [
  <Button key="cancel" variant="secondary" size="sm">
    Cancel
  </Button>,
  <Button key="action" size="sm">
    Action
  </Button>,
];

const LayoutsPage = () => {
  const navigate = useNavigate();
  const [loadingKey, setLoadingKey] = React.useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <Layout>
        <Layout.Header title="1 Column" actions={layoutHeaderActions} />
        <Layout.Column>
          <DescriptionCard
            data={mockPurchaseOrder}
            title="Order Overview"
            columns={4}
            fields={orderOverviewFields}
          />
        </Layout.Column>
      </Layout>

      <Layout>
        <Layout.Header title="2 Columns" actions={layoutHeaderActions} />
        <Layout.Column>
          <DescriptionCard
            data={mockPurchaseOrder}
            title="Order Overview"
            columns={4}
            fields={orderOverviewFields}
          />
        </Layout.Column>
        <Layout.Column>
          <ActionPanel
            title="Actions"
            actions={[
              {
                key: "create-invoice",
                label: "Create new sales invoice",
                icon: <Receipt />,
                onClick: () => {
                  setLoadingKey("create-invoice");
                  setTimeout(() => setLoadingKey(null), 1000);
                },
                loading: loadingKey === "create-invoice",
              },
              {
                key: "delivery-note",
                label: "Create new delivery note",
                icon: <FileText />,
                onClick: () => {},
              },
              {
                key: "view-po-demo",
                label: "Open Vite order detail",
                icon: <ExternalLink />,
                onClick: () => navigate("/dashboard/orders/INV-1000"),
              },
            ]}
          />
          <ActivityCard
            title="Updates"
            maxVisible={6}
            overflowLabel="more"
            groupBy="day"
            items={activityItems}
          />
          <ActionPanel title="Additional actions" actions={[]} />
        </Layout.Column>
      </Layout>

      <Layout>
        <Layout.Header title="3 Columns" actions={layoutHeaderActions} />
        <Layout.Column>
          <Placeholder columnNumber={1} />
        </Layout.Column>
        <Layout.Column>
          <DescriptionCard
            data={mockPurchaseOrder}
            title="Order Overview"
            columns={4}
            fields={orderOverviewFields}
          />
        </Layout.Column>
        <Layout.Column>
          <Placeholder columnNumber={3} />
        </Layout.Column>
      </Layout>

      <Layout>
        <Layout.Header title="Named areas" />
        <Layout.Column area="left">
          <Placeholder columnNumber={1} />
        </Layout.Column>
        <Layout.Column area="main">
          <Placeholder columnNumber={2} />
        </Layout.Column>
      </Layout>

      <Layout>
        <Layout.Header title="More than 3 columns" />
        <Layout.Column>
          <Placeholder columnNumber={1} />
        </Layout.Column>
        <Layout.Column>
          <Placeholder columnNumber={2} />
        </Layout.Column>
        <Layout.Column>
          <Placeholder columnNumber={3} />
        </Layout.Column>
        <Layout.Column>
          <Placeholder columnNumber={4} />
        </Layout.Column>
      </Layout>
    </div>
  );
};

LayoutsPage.appShellPageProps = {
  meta: {
    title: "Layout Demos",
    icon: <LayoutPanelTop size={16} />,
  },
} satisfies AppShellPageProps;

export default LayoutsPage;
