import {
  defineResource,
  Layout,
  Button,
  DescriptionCard,
  ActionPanel,
  ActivityCard,
  useNavigate,
} from "@tailor-platform/app-shell";
import * as React from "react";
import { mockPurchaseOrder } from "./purchase-order-demo";
import { activityCardDemoActivities } from "./activity-card-demo";
import { ReceiptIcon, FileTextIcon, ExternalLinkIcon } from "./action-panel-demo";

/**
 * Placeholder component with subtle diagonal lines pattern for empty content areas
 */
const Placeholder = ({ columnNumber }: { columnNumber: number }) => {
  return (
    <div
      className="astw:rounded-md astw:border astw:border-border astw:bg-muted astw:flex astw:items-center astw:justify-center astw:relative astw:overflow-hidden"
      style={{ minHeight: 260, height: 260 }}
    >
      {/* Pattern overlay - different for light and dark mode */}
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
      {/* Column number */}
      <span className="astw:text-4xl astw:font-bold astw:text-muted-foreground astw:relative astw:z-10">
        {columnNumber}
      </span>
    </div>
  );
};

const layoutHeaderActions = [
  <Button
    key="cancel"
    variant="secondary"
    size="sm"
    onClick={() => {
      alert("Secondary button clicked!");
    }}
  >
    Cancel
  </Button>,
  <Button
    key="action"
    size="sm"
    onClick={() => {
      alert("Primary button clicked!");
    }}
  >
    Action
  </Button>,
];

export const oneColumnLayoutResource = defineResource({
  path: "layout-1-column",
  meta: {
    title: "1 Column",
  },
  component: () => {
    return (
      <Layout>
        <Layout.Header title="1 Column" actions={layoutHeaderActions} />
        <Layout.Column>
          <DescriptionCard
            data={mockPurchaseOrder}
            title="Order Overview"
            columns={4}
            fields={[
              {
                key: "docNumber",
                label: "PO Number",
                meta: { copyable: true },
              },
              {
                key: "externalReference",
                label: "External Ref",
                meta: { copyable: true },
              },
              { key: "supplierName", label: "Supplier" },
              { type: "divider" },
              {
                key: "expectedDeliveryDate",
                label: "Expected Delivery",
                type: "date",
                meta: { dateFormat: "medium" },
              },
              {
                key: "confirmedAt",
                label: "Confirmed",
                type: "date",
                meta: { dateFormat: "medium" },
              },
              {
                key: "createdAt",
                label: "Created",
                type: "date",
                meta: { dateFormat: "relative" },
              },
              { key: "shipToLocation.name", label: "Warehouse" },
              { type: "divider" },
              {
                key: "shipToLocation.address",
                label: "Shipping Address",
                type: "address",
                meta: { copyable: true },
              },
              { key: "note", label: "Notes", meta: { truncateLines: 3 } },
            ]}
          />
        </Layout.Column>
      </Layout>
    );
  },
});

export const twoColumnLayoutResource = defineResource({
  path: "layout-2-columns",
  meta: {
    title: "2 Columns",
  },
  component: () => {
    const navigate = useNavigate();
    const [loadingKey, setLoadingKey] = React.useState<string | null>(null);

    const handleCreateInvoice = () => {
      setLoadingKey("create-invoice");
      setTimeout(() => {
        setLoadingKey(null);
        alert("Create invoice clicked");
      }, 1500);
    };

    const actions = [
      {
        key: "create-invoice",
        label: "Create new sales invoice",
        icon: <ReceiptIcon />,
        onClick: handleCreateInvoice,
        loading: loadingKey === "create-invoice",
      },
      {
        key: "delivery-note",
        label: "Create new delivery note",
        icon: <FileTextIcon />,
        onClick: () => alert("Create delivery note clicked"),
      },
      {
        key: "view-po-demo",
        label: "View Purchase Order",
        icon: <ExternalLinkIcon />,
        onClick: () => navigate("/custom-page/purchase-order-demo"),
      },
    ];

    return (
      <Layout>
        <Layout.Header title="2 Columns" actions={layoutHeaderActions} />
        <Layout.Column>
          <DescriptionCard
            data={mockPurchaseOrder}
            title="Order Overview"
            columns={4}
            fields={[
              {
                key: "docNumber",
                label: "PO Number",
                meta: { copyable: true },
              },
              {
                key: "externalReference",
                label: "External Ref",
                meta: { copyable: true },
              },
              { key: "supplierName", label: "Supplier" },
              { type: "divider" },
              {
                key: "expectedDeliveryDate",
                label: "Expected Delivery",
                type: "date",
                meta: { dateFormat: "medium" },
              },
              {
                key: "confirmedAt",
                label: "Confirmed",
                type: "date",
                meta: { dateFormat: "medium" },
              },
              {
                key: "createdAt",
                label: "Created",
                type: "date",
                meta: { dateFormat: "relative" },
              },
              { key: "shipToLocation.name", label: "Warehouse" },
              { type: "divider" },
              {
                key: "shipToLocation.address",
                label: "Shipping Address",
                type: "address",
                meta: { copyable: true },
              },
              { key: "note", label: "Notes", meta: { truncateLines: 3 } },
            ]}
          />
        </Layout.Column>
        <Layout.Column>
          <ActionPanel title="Actions" actions={actions} />
          <ActivityCard
            title="Updates"
            maxVisible={6}
            overflowLabel="more"
            groupBy="day"
            items={activityCardDemoActivities}
          />
          <ActionPanel title="Additional actions" actions={[]} />
        </Layout.Column>
      </Layout>
    );
  },
});

export const threeColumnLayoutResource = defineResource({
  path: "layout-3-columns",
  meta: {
    title: "3 Columns",
  },
  component: () => {
    return (
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
            fields={[
              {
                key: "docNumber",
                label: "PO Number",
                meta: { copyable: true },
              },
              {
                key: "externalReference",
                label: "External Ref",
                meta: { copyable: true },
              },
              { key: "supplierName", label: "Supplier" },
              { type: "divider" },
              {
                key: "expectedDeliveryDate",
                label: "Expected Delivery",
                type: "date",
                meta: { dateFormat: "medium" },
              },
              {
                key: "confirmedAt",
                label: "Confirmed",
                type: "date",
                meta: { dateFormat: "medium" },
              },
              {
                key: "createdAt",
                label: "Created",
                type: "date",
                meta: { dateFormat: "relative" },
              },
              { key: "shipToLocation.name", label: "Warehouse" },
              { type: "divider" },
              {
                key: "shipToLocation.address",
                label: "Shipping Address",
                type: "address",
                meta: { copyable: true },
              },
              { key: "note", label: "Notes", meta: { truncateLines: 3 } },
            ]}
          />
        </Layout.Column>
        <Layout.Column>
          <Placeholder columnNumber={3} />
        </Layout.Column>
      </Layout>
    );
  },
});

export const layoutSlotsDemoResource = defineResource({
  path: "layout-patterns",
  meta: {
    title: "Layout Patterns Demo",
  },
  component: () => (
    <div className="astw:flex astw:flex-col astw:gap-4">
      {/* 2 columns (area: left + main) */}
      <Layout>
        <Layout.Header title="2 Columns with Left + Main Areas" />
        <Layout.Column area="left">
          <Placeholder columnNumber={1} />
        </Layout.Column>
        <Layout.Column area="main">
          <Placeholder columnNumber={2} />
        </Layout.Column>
      </Layout>

      {/* More than 3 columns */}
      <Layout>
        <Layout.Header title="More than 3 Columns" />
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
  ),
});
