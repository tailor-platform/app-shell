import {
  defineModule,
  defineResource,
  Link,
  ResourceComponentProps,
  useNavigate,
  useParams,
  hidden,
  pass,
  DescriptionCard,
  ActionPanel,
  ActivityCard,
  Layout,
  Button,
  Input,
  Table,
  Dialog,
  Menu,
  Sheet,
  Tooltip,
  Badge,
  Select,
  Combobox,
  Autocomplete,
  MetricCard,
  type Guard,
} from "@tailor-platform/app-shell";
import type { SVGProps } from "react";
import { useT, labels } from "./i18n-labels";
import * as React from "react";

const ZapIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 14a1 1 0 0 1-.8-1.6l9-11A1 1 0 0 1 14 2v7h6a1 1 0 0 1 .8 1.6l-9 11A1 1 0 0 1 10 22v-7z" />
    </svg>
  );
};

// Small icons for ActionPanel demo (16px)
const ReceiptIcon = (props: SVGProps<SVGSVGElement>) => (
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
    {...props}
  >
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
    <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
    <path d="M12 17.5v-11" />
  </svg>
);
const FileTextIcon = (props: SVGProps<SVGSVGElement>) => (
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
    {...props}
  >
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" x2="8" y1="13" y2="13" />
    <line x1="16" x2="8" y1="17" y2="17" />
    <line x1="10" x2="8" y1="9" y2="9" />
  </svg>
);
const ExternalLinkIcon = (props: SVGProps<SVGSVGElement>) => (
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
    {...props}
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" x2="21" y1="14" y2="3" />
  </svg>
);

// ============================================================================
// DEMO: Action Panel Page
// ============================================================================

const ActionPanelDemoPage = () => {
  const navigate = useNavigate();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        padding: "1.5rem",
        width: "100%",
        maxWidth: "480px",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Action Panel Demo</h1>
      <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem" }}>
        This panel fills the width of its container. All actions use <code>onClick</code>; for
        navigation use <code>useNavigate()</code> inside the callback.
      </p>
      <ActionPanel
        title="Actions"
        actions={[
          {
            key: "create-invoice",
            label: "Create new sales invoice",
            icon: <ReceiptIcon />,
            onClick: () => alert("Create invoice clicked"),
          },
          {
            key: "delivery-note",
            label: "Create new delivery note",
            icon: <FileTextIcon />,
            onClick: () => alert("Create delivery note clicked"),
          },
          {
            key: "view-po-demo",
            label: "View Purchase Order Demo",
            icon: <ExternalLinkIcon />,
            onClick: () => navigate("/custom-page/purchase-order-demo"),
          },
        ]}
      />
    </div>
  );
};

const actionPanelDemoResource = defineResource({
  path: "action-panel-demo",
  meta: { title: "Action Panel Demo" },
  component: ActionPanelDemoPage,
});

// ============================================================================
// DEMO: MetricCard (KPI row)
// ============================================================================

const MetricCardDemoPage = () => (
  <Layout>
    <Layout.Header title="MetricCard Demo" />
    <Layout.Column>
      <p className="astw:text-sm astw:text-muted-foreground astw:mb-4">
        Dashboard KPI cards: title, value, optional trend and description.
      </p>
      <div className="astw:flex astw:flex-row astw:flex-wrap astw:gap-4">
        <div className="astw:min-w-[200px] astw:flex-1">
          <MetricCard
            title="Net total"
            value="$1,500.00"
            trend={{ direction: "up", value: "+5%" }}
            description="vs last month"
          />
        </div>
        <div className="astw:min-w-[200px] astw:flex-1">
          <MetricCard
            title="Discount total"
            value="$120.00"
            trend={{ direction: "down", value: "-2%" }}
            description="vs last month"
          />
        </div>
        <div className="astw:min-w-[200px] astw:flex-1">
          <MetricCard
            title="Orders"
            value="42"
            trend={{ direction: "neutral", value: "0%" }}
            description="this week"
            icon={<ZapIcon style={{ width: 14, height: 14 }} />}
          />
        </div>
        <div className="astw:min-w-[200px] astw:flex-1">
          <MetricCard title="Revenue (MTD)" value="$8,200" description="vs last month" />
        </div>
      </div>
    </Layout.Column>
  </Layout>
);

const metricCardDemoResource = defineResource({
  path: "metric-card-demo",
  meta: { title: "MetricCard Demo" },
  component: MetricCardDemoPage,
});

// ============================================================================
// DEMO: ActivityCard (document updates / activity timeline)
// ============================================================================

const activityCardDemoActivities = [
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
    actor: { name: "Pradeep Kumar" },
    description: "added a note",
    timestamp: new Date("2025-03-21T15:16:00"),
  },
  {
    id: "4",
    actor: { name: "Hanna" },
    description: "updated delivery date",
    timestamp: new Date("2025-03-20T14:00:00"),
  },
  {
    id: "5",
    actor: { name: "Pradeep Kumar" },
    description: "created this PO",
    timestamp: new Date("2025-03-20T15:16:00"),
  },
  {
    id: "6",
    description: "sent confirmation email",
    timestamp: new Date("2025-03-20T10:00:00"),
  },
  {
    id: "7",
    actor: { name: "Hanna" },
    description: "approved the order",
    timestamp: new Date("2025-03-19T11:30:00"),
  },
  {
    id: "8",
    actor: { name: "Pradeep Kumar" },
    description: "added a note",
    timestamp: new Date("2025-03-19T09:00:00"),
  },
];

const ActivityCardDemoPage = () => (
  <Layout>
    <Layout.Column>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
        ActivityCard Demo
      </h1>
      <p style={{ color: "var(--muted-foreground)", marginBottom: "1.5rem" }}>
        Timeline of recent activities on a document (e.g. PO, SO, GR). Click &quot;N more
        activities&quot; to open the full list in a dialog.
      </p>
      <div style={{ maxWidth: 360 }}>
        <ActivityCard
          title="Updates"
          maxVisible={6}
          overflowLabel="more"
          groupBy="day"
          activities={activityCardDemoActivities}
        />
      </div>
    </Layout.Column>
  </Layout>
);

const activityCardDemoResource = defineResource({
  path: "activity-card-demo",
  meta: { title: "ActivityCard Demo" },
  component: ActivityCardDemoPage,
});

// ============================================================================
// DEMO: Purchase Order Detail Page
// ============================================================================

// Simulated backend data (like what you'd get from GraphQL/REST API)
const mockPurchaseOrder = {
  id: "po-2024-0042",
  docNumber: "PO-10000041",
  status: "CONFIRMED",
  billingStatus: "PARTIALLY_BILLED",
  deliveryStatus: "NOT_RECEIVED",
  supplierName: "Acme Industrial Supplies",
  supplierID: "supplier-123",
  expectedDeliveryDate: "2024-02-15T00:00:00Z",
  createdAt: "2024-01-20T10:30:00Z",
  updatedAt: "2024-01-22T14:45:00Z",
  confirmedAt: "2024-01-21T09:00:00Z",
  note: "Rush order - priority shipping requested. Please ensure all  Please ensure all  Please ensure all",
  externalReference: "P00594",
  currency: { code: "USD", symbol: "$" },
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
  // Computed totals (would come from backend)
  subtotal: 12500.0,
  tax: 1031.25,
  total: 13531.25,
};

const PurchaseOrderDetailPage = () => {
  // In a real app, you'd fetch this data:
  // const { data: purchaseOrder } = useQuery(GET_PURCHASE_ORDER, { variables: { id } });
  const purchaseOrder = mockPurchaseOrder;

  return (
    <Layout>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
        Purchase Order: {purchaseOrder.docNumber}
      </h1>

      {/* Status Overview Card */}
      <DescriptionCard
        data={purchaseOrder}
        title="Status Overview"
        columns={4}
        fields={[
          {
            key: "status",
            label: "Status",
            type: "badge",
            meta: {
              badgeVariantMap: {
                DRAFT: "success",
                CONFIRMED: "success",
                CLOSED: "success",
                CANCELED: "outline-error",
              },
            },
          },
          {
            key: "billingStatus",
            label: "Billing",
            type: "badge",
            meta: {
              badgeVariantMap: {
                NOT_BILLED: "outline-neutral",
                PARTIALLY_BILLED: "outline-warning",
                BILLED: "outline-success",
              },
            },
          },
          {
            key: "deliveryStatus",
            label: "Delivery",
            type: "badge",
            meta: {
              badgeVariantMap: {
                NOT_RECEIVED: "outline-neutral",
                PARTIALLY_RECEIVED: "outline-warning",
                RECEIVED: "outline-success",
              },
            },
          },
        ]}
      />

      {/* Order Details Card */}
      <DescriptionCard
        data={purchaseOrder}
        title="Order Overview"
        columns={4}
        fields={[
          { key: "docNumber", label: "PO Number", meta: { copyable: true } },
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

      {/* Financial Summary Card */}
      <DescriptionCard
        data={purchaseOrder}
        title="Financial Summary"
        columns={4}
        fields={[
          {
            key: "subtotal",
            label: "Subtotal",
            type: "money",
            meta: { currencyKey: "currency.code" },
          },
          {
            key: "tax",
            label: "Tax",
            type: "money",
            meta: { currencyKey: "currency.code" },
          },
          {
            key: "total",
            label: "Total",
            type: "money",
            meta: { currencyKey: "currency.code" },
          },
          { key: "currency.code", label: "Currency" },
        ]}
      />
    </Layout>
  );
};

const purchaseOrderDemoResource = defineResource({
  path: "purchase-order-demo",
  meta: {
    title: "Purchase Order Demo",
  },
  component: PurchaseOrderDetailPage,
});

const dynamicPageResource = defineResource({
  path: ":id",
  meta: {
    title: labels.t("dynamicPageTitle"),
  },
  component: () => {
    const params = useParams<{ id: string }>();
    const t = useT();

    return (
      <div>
        <p>{t("dynamicPageDescription", { id: params.id! })}</p>
      </div>
    );
  },
});

const subSubPageResource = defineResource({
  path: "sub1-1",
  meta: {
    title: labels.t("subSubPageTitle"),
  },
  subResources: [dynamicPageResource],
  component: () => {
    const t = useT();

    return (
      <div>
        <p>{t("subSubPageDescription")}</p>
      </div>
    );
  },
});

const subPageResource = defineResource({
  path: "sub1",
  meta: {
    title: labels.t("subPageTitle"),
  },
  subResources: [subSubPageResource],
  component: () => {
    const t = useT();

    return (
      <div>
        <p>{t("subPageDescription")}</p>
      </div>
    );
  },
});

const hiddenResource = defineResource({
  path: "hidden",
  meta: {
    title: "Hidden Page",
  },
  guards: [() => hidden()],
  component: () => {
    return (
      <div>
        <p>This page should be hidden from navigation.</p>
      </div>
    );
  },
});

// ============================================================================
// DEMO: Admin Only Restricted Resource
// ============================================================================

/**
 * Guard that checks if the user has admin role.
 * Uses contextData passed from AppShell to determine access.
 *
 * The module augmentation in role-switcher-context.tsx defines the
 * expected contextData type, so context.role is properly typed here.
 */
const adminOnlyGuard: Guard = ({ context }) => {
  if (context.role !== "admin") {
    return hidden();
  }
  return pass();
};

const ShieldIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  );
};

const adminOnlyResource = defineResource({
  path: "admin-only",
  meta: {
    title: "Admin Only",
    icon: <ShieldIcon />,
  },
  guards: [adminOnlyGuard],
  component: () => {
    return (
      <div style={{ padding: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          <ShieldIcon
            style={{
              width: "24px",
              height: "24px",
              color: "hsl(var(--primary))",
            }}
          />
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Admin Only Page</h1>
        </div>
        <div
          style={{
            padding: "1rem",
            backgroundColor: "hsl(var(--muted))",
            borderRadius: "0.5rem",
            border: "1px solid hsl(var(--border))",
          }}
        >
          <p style={{ marginBottom: "0.75rem" }}>
            🎉 <strong>Congratulations!</strong> You have admin access.
          </p>
          <p style={{ marginBottom: "0.75rem" }}>
            This page is only visible when you select <strong>"Admin"</strong> role from the
            sidebar.
          </p>
          <p
            style={{
              color: "hsl(var(--muted-foreground))",
              fontSize: "0.875rem",
            }}
          >
            Try switching to "Staff" role - this page will disappear from the navigation and become
            inaccessible.
          </p>
        </div>
        <div style={{ marginTop: "1.5rem" }}>
          <h2
            style={{
              fontSize: "1.125rem",
              fontWeight: "600",
              marginBottom: "0.75rem",
            }}
          >
            How it works:
          </h2>
          <ul
            style={{
              listStyle: "disc",
              paddingLeft: "1.5rem",
              lineHeight: "1.75",
            }}
          >
            <li>
              The{" "}
              <code
                style={{
                  backgroundColor: "hsl(var(--muted))",
                  padding: "0.125rem 0.25rem",
                  borderRadius: "0.25rem",
                }}
              >
                RoleSwitcherContext
              </code>{" "}
              manages the current role state
            </li>
            <li>
              The role is passed to AppShell via{" "}
              <code
                style={{
                  backgroundColor: "hsl(var(--muted))",
                  padding: "0.125rem 0.25rem",
                  borderRadius: "0.25rem",
                }}
              >
                contextData
              </code>{" "}
              prop
            </li>
            <li>
              A route guard checks{" "}
              <code
                style={{
                  backgroundColor: "hsl(var(--muted))",
                  padding: "0.125rem 0.25rem",
                  borderRadius: "0.25rem",
                }}
              >
                context.role
              </code>{" "}
              and returns{" "}
              <code
                style={{
                  backgroundColor: "hsl(var(--muted))",
                  padding: "0.125rem 0.25rem",
                  borderRadius: "0.25rem",
                }}
              >
                hidden()
              </code>{" "}
              for non-admins
            </li>
            <li>The navigation automatically hides resources that are guarded</li>
          </ul>
        </div>
      </div>
    );
  },
});

// ============================================================================
// PLACEHOLDER COMPONENT
// ============================================================================

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

// ============================================================================
// DEMO: Layout Component Examples
// ============================================================================

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

const oneColumnLayoutResource = defineResource({
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

const twoColumnLayoutResource = defineResource({
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
            activities={activityCardDemoActivities}
          />
          <ActionPanel title="Additional actions" actions={[]} />
        </Layout.Column>
      </Layout>
    );
  },
});

const threeColumnLayoutResource = defineResource({
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

// ============================================================================
// DEMO: Layout Slots (composition API)
// ============================================================================

const layoutSlotsDemoResource = defineResource({
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

// ============================================================================
// DEMO: Primitive Components
// ============================================================================

const primitiveComponentsDemoResource = defineResource({
  path: "primitives-demo",
  meta: {
    title: "Primitive Components Demo",
  },
  component: () => {
    const [inputValue, setInputValue] = React.useState("");
    const [showToolbar, setShowToolbar] = React.useState(true);
    const [showSidebar, setShowSidebar] = React.useState(false);
    const [sortOrder, setSortOrder] = React.useState("date");

    const cardStyle: React.CSSProperties = {
      padding: "1.5rem",
      borderRadius: "0.75rem",
      border: "1px solid var(--border)",
      backgroundColor: "var(--card)",
      color: "var(--card-foreground)",
    };
    const headingStyle: React.CSSProperties = {
      fontWeight: "bold",
      marginBottom: "0.5rem",
    };
    const labelStyle: React.CSSProperties = {
      fontSize: "0.875rem",
      color: "var(--muted-foreground)",
      marginBottom: "0.5rem",
    };
    const rowStyle: React.CSSProperties = {
      display: "flex",
      gap: "0.5rem",
      flexWrap: "wrap",
    };

    return (
      <Layout>
        <Layout.Header title="Primitive Components" />
        <Layout.Column>
          {/* Button variants */}
          <div style={cardStyle}>
            <h3 style={headingStyle}>Button</h3>
            <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
              <div>
                <div style={labelStyle}>Variant</div>
                <div style={rowStyle}>
                  <Button>Default</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                </div>
              </div>
              <div>
                <div style={labelStyle}>Size</div>
                <div style={{ ...rowStyle, alignItems: "center" }}>
                  <Button size="sm">Small</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large</Button>
                  <Button disabled>Disabled</Button>
                </div>
              </div>
            </div>
          </div>

          {/* Input */}
          <div style={cardStyle}>
            <h3 style={headingStyle}>Input</h3>
            <div style={rowStyle}>
              <Input
                style={{ maxWidth: "240px" }}
                placeholder="Type something..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <Input style={{ maxWidth: "240px" }} type="email" placeholder="Email" />
              <Input style={{ maxWidth: "240px" }} disabled placeholder="Disabled" />
            </div>
          </div>

          {/* Badge */}
          <div style={cardStyle}>
            <h3 style={headingStyle}>Badge</h3>
            <div style={rowStyle}>
              <Badge>Default</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="neutral">Neutral</Badge>
              <Badge variant="outline-success">Outline</Badge>
            </div>
          </div>

          {/* Tooltip */}
          <div style={cardStyle}>
            <h3 style={headingStyle}>Tooltip</h3>
            <Tooltip.Provider>
              <div style={{ ...rowStyle, gap: "1rem" }}>
                <Tooltip.Root>
                  <Tooltip.Trigger render={<Button variant="outline" />}>
                    Top (default)
                  </Tooltip.Trigger>
                  <Tooltip.Content position={{ side: "top" }}>Tooltip on top</Tooltip.Content>
                </Tooltip.Root>
                <Tooltip.Root>
                  <Tooltip.Trigger render={<Button variant="outline" />}>Bottom</Tooltip.Trigger>
                  <Tooltip.Content position={{ side: "bottom" }}>Tooltip on bottom</Tooltip.Content>
                </Tooltip.Root>
                <Tooltip.Root>
                  <Tooltip.Trigger render={<Button variant="outline" />}>Left</Tooltip.Trigger>
                  <Tooltip.Content position={{ side: "left" }}>Tooltip on left</Tooltip.Content>
                </Tooltip.Root>
                <Tooltip.Root>
                  <Tooltip.Trigger render={<Button variant="outline" />}>Right</Tooltip.Trigger>
                  <Tooltip.Content position={{ side: "right" }}>Tooltip on right</Tooltip.Content>
                </Tooltip.Root>
              </div>
            </Tooltip.Provider>
          </div>

          {/* Dialog */}
          <div style={cardStyle}>
            <h3 style={headingStyle}>Dialog</h3>
            <Dialog.Root>
              <Dialog.Trigger render={<Button variant="outline" />}>Open Dialog</Dialog.Trigger>
              <Dialog.Content>
                <Dialog.Header>
                  <Dialog.Title>Dialog Title</Dialog.Title>
                  <Dialog.Description>
                    This is a dialog description. You can put any content here.
                  </Dialog.Description>
                </Dialog.Header>
                <Dialog.Footer>
                  <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
                  <Dialog.Close render={<Button />}>Confirm</Dialog.Close>
                </Dialog.Footer>
              </Dialog.Content>
            </Dialog.Root>
          </div>

          {/* Sheet */}
          <div style={cardStyle}>
            <h3 style={headingStyle}>Sheet</h3>
            <div style={rowStyle}>
              <Sheet.Root side="right">
                <Sheet.Trigger render={<Button variant="outline" />}>
                  Open Sheet (Right)
                </Sheet.Trigger>
                <Sheet.Content>
                  <Sheet.Header>
                    <Sheet.Title>Sheet Title</Sheet.Title>
                    <Sheet.Description>This sheet slides in from the right.</Sheet.Description>
                  </Sheet.Header>
                  <div style={{ padding: "1rem 0" }}>Sheet content goes here.</div>
                  <Sheet.Footer>
                    <Sheet.Close render={<Button variant="outline" />}>Close</Sheet.Close>
                  </Sheet.Footer>
                </Sheet.Content>
              </Sheet.Root>
              <Sheet.Root side="left">
                <Sheet.Trigger render={<Button variant="outline" />}>
                  Open Sheet (Left)
                </Sheet.Trigger>
                <Sheet.Content>
                  <Sheet.Header>
                    <Sheet.Title>Left Sheet</Sheet.Title>
                    <Sheet.Description>This sheet slides in from the left.</Sheet.Description>
                  </Sheet.Header>
                  <Sheet.Footer>
                    <Sheet.Close render={<Button variant="outline" />}>Close</Sheet.Close>
                  </Sheet.Footer>
                </Sheet.Content>
              </Sheet.Root>
              <Sheet.Root side="bottom">
                <Sheet.Trigger render={<Button variant="outline" />}>
                  Open Sheet (Bottom)
                </Sheet.Trigger>
                <Sheet.Content>
                  <Sheet.Header>
                    <Sheet.Title>Bottom Sheet</Sheet.Title>
                    <Sheet.Description>This sheet slides in from the bottom.</Sheet.Description>
                  </Sheet.Header>
                  <Sheet.Footer>
                    <Sheet.Close render={<Button variant="outline" />}>Close</Sheet.Close>
                  </Sheet.Footer>
                </Sheet.Content>
              </Sheet.Root>
            </div>
          </div>

          {/* Menu */}
          <div style={cardStyle}>
            <h3 style={headingStyle}>Menu</h3>
            <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
              <div>
                <div style={labelStyle}>Pattern</div>
                <div style={rowStyle}>
                  <Menu.Root>
                    <Menu.Trigger render={<Button variant="outline" />}>Basic</Menu.Trigger>
                    <Menu.Content>
                      <Menu.Item onClick={() => alert("Edit clicked")}>Edit</Menu.Item>
                      <Menu.Item onClick={() => alert("Duplicate clicked")}>Duplicate</Menu.Item>
                      <Menu.Item onClick={() => alert("Copy ID clicked")}>Copy ID</Menu.Item>
                      <Menu.Separator />
                      <Menu.Item
                        onClick={() => alert("Delete clicked")}
                        className="astw:text-destructive"
                      >
                        Delete
                      </Menu.Item>
                    </Menu.Content>
                  </Menu.Root>
                  <Menu.Root>
                    <Menu.Trigger render={<Button variant="outline" />}>
                      Checkbox & Radio
                    </Menu.Trigger>
                    <Menu.Content>
                      <Menu.Group>
                        <Menu.GroupLabel>Panels</Menu.GroupLabel>
                        <Menu.CheckboxItem checked={showToolbar} onCheckedChange={setShowToolbar}>
                          <Menu.CheckboxItemIndicator>✓</Menu.CheckboxItemIndicator>
                          Show Toolbar
                        </Menu.CheckboxItem>
                        <Menu.CheckboxItem checked={showSidebar} onCheckedChange={setShowSidebar}>
                          <Menu.CheckboxItemIndicator>✓</Menu.CheckboxItemIndicator>
                          Show Sidebar
                        </Menu.CheckboxItem>
                      </Menu.Group>
                      <Menu.Separator />
                      <Menu.Group>
                        <Menu.GroupLabel>Sort by</Menu.GroupLabel>
                        <Menu.RadioGroup value={sortOrder} onValueChange={setSortOrder}>
                          <Menu.RadioItem value="date">
                            <Menu.RadioItemIndicator>●</Menu.RadioItemIndicator>
                            Date
                          </Menu.RadioItem>
                          <Menu.RadioItem value="name">
                            <Menu.RadioItemIndicator>●</Menu.RadioItemIndicator>
                            Name
                          </Menu.RadioItem>
                          <Menu.RadioItem value="size">
                            <Menu.RadioItemIndicator>●</Menu.RadioItemIndicator>
                            Size
                          </Menu.RadioItem>
                        </Menu.RadioGroup>
                      </Menu.Group>
                    </Menu.Content>
                  </Menu.Root>
                  <Menu.Root>
                    <Menu.Trigger render={<Button variant="outline" />}>Submenu</Menu.Trigger>
                    <Menu.Content>
                      <Menu.Group>
                        <Menu.GroupLabel>Document</Menu.GroupLabel>
                        <Menu.Item onClick={() => alert("New")}>New</Menu.Item>
                        <Menu.Item onClick={() => alert("Open")}>Open</Menu.Item>
                        <Menu.Item onClick={() => alert("Save")}>Save</Menu.Item>
                      </Menu.Group>
                      <Menu.Separator />
                      <Menu.SubmenuRoot>
                        <Menu.SubmenuTrigger>Export as →</Menu.SubmenuTrigger>
                        <Menu.Content position={{ side: "right", align: "start" }}>
                          <Menu.Item onClick={() => alert("PDF")}>PDF</Menu.Item>
                          <Menu.Item onClick={() => alert("CSV")}>CSV</Menu.Item>
                          <Menu.Item onClick={() => alert("JSON")}>JSON</Menu.Item>
                        </Menu.Content>
                      </Menu.SubmenuRoot>
                      <Menu.Separator />
                      <Menu.Item disabled>Print (unavailable)</Menu.Item>
                    </Menu.Content>
                  </Menu.Root>
                </div>
              </div>
              <div>
                <div style={labelStyle}>Direction</div>
                <div style={rowStyle}>
                  <Menu.Root>
                    <Menu.Trigger render={<Button variant="outline" />}>Bottom ↓</Menu.Trigger>
                    <Menu.Content position={{ side: "bottom" }}>
                      <Menu.Item>Item 1</Menu.Item>
                      <Menu.Item>Item 2</Menu.Item>
                      <Menu.Item>Item 3</Menu.Item>
                    </Menu.Content>
                  </Menu.Root>
                  <Menu.Root>
                    <Menu.Trigger render={<Button variant="outline" />}>Top ↑</Menu.Trigger>
                    <Menu.Content position={{ side: "top" }}>
                      <Menu.Item>Item 1</Menu.Item>
                      <Menu.Item>Item 2</Menu.Item>
                      <Menu.Item>Item 3</Menu.Item>
                    </Menu.Content>
                  </Menu.Root>
                  <Menu.Root>
                    <Menu.Trigger render={<Button variant="outline" />}>Right →</Menu.Trigger>
                    <Menu.Content position={{ side: "right" }}>
                      <Menu.Item>Item 1</Menu.Item>
                      <Menu.Item>Item 2</Menu.Item>
                      <Menu.Item>Item 3</Menu.Item>
                    </Menu.Content>
                  </Menu.Root>
                  <Menu.Root>
                    <Menu.Trigger render={<Button variant="outline" />}>Left ←</Menu.Trigger>
                    <Menu.Content position={{ side: "left" }}>
                      <Menu.Item>Item 1</Menu.Item>
                      <Menu.Item>Item 2</Menu.Item>
                      <Menu.Item>Item 3</Menu.Item>
                    </Menu.Content>
                  </Menu.Root>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div style={cardStyle}>
            <h3 style={headingStyle}>Table</h3>
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Name</Table.Head>
                  <Table.Head>Status</Table.Head>
                  <Table.Head>Role</Table.Head>
                  <Table.Head>Amount</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                <Table.Row>
                  <Table.Cell>Alice Johnson</Table.Cell>
                  <Table.Cell>
                    <Badge variant="success">Active</Badge>
                  </Table.Cell>
                  <Table.Cell>Admin</Table.Cell>
                  <Table.Cell>$1,200.00</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>Bob Smith</Table.Cell>
                  <Table.Cell>
                    <Badge variant="neutral">Inactive</Badge>
                  </Table.Cell>
                  <Table.Cell>Editor</Table.Cell>
                  <Table.Cell>$800.00</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>Carol Lee</Table.Cell>
                  <Table.Cell>
                    <Badge variant="success">Active</Badge>
                  </Table.Cell>
                  <Table.Cell>Viewer</Table.Cell>
                  <Table.Cell>$350.00</Table.Cell>
                </Table.Row>
              </Table.Body>
              <Table.Footer>
                <Table.Row>
                  <Table.Cell colSpan={3}>Total</Table.Cell>
                  <Table.Cell>$2,350.00</Table.Cell>
                </Table.Row>
              </Table.Footer>
            </Table.Root>
          </div>
        </Layout.Column>
      </Layout>
    );
  },
});

// ============================================================================
// DEMO: Select, Combobox, Autocomplete
// ============================================================================

interface Fruit {
  id: string;
  name: string;
  emoji: string;
}

const fruits: Fruit[] = [
  { id: "apple", name: "Apple", emoji: "🍎" },
  { id: "banana", name: "Banana", emoji: "🍌" },
  { id: "cherry", name: "Cherry", emoji: "🍒" },
  { id: "grape", name: "Grape", emoji: "🍇" },
  { id: "mango", name: "Mango", emoji: "🥭" },
  { id: "orange", name: "Orange", emoji: "🍊" },
  { id: "peach", name: "Peach", emoji: "🍑" },
  { id: "strawberry", name: "Strawberry", emoji: "🍓" },
];

const groupedFruits = [
  {
    label: "Tropical",
    items: [
      { id: "banana", name: "Banana", emoji: "🍌" },
      { id: "mango", name: "Mango", emoji: "🥭" },
      { id: "pineapple", name: "Pineapple", emoji: "🍍" },
    ],
  },
  {
    label: "Berries",
    items: [
      { id: "cherry", name: "Cherry", emoji: "🍒" },
      { id: "grape", name: "Grape", emoji: "🍇" },
      { id: "strawberry", name: "Strawberry", emoji: "🍓" },
    ],
  },
];

const allProgrammingLanguages = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "Go",
  "Rust",
  "C",
  "C++",
  "C#",
  "Ruby",
  "PHP",
  "Swift",
  "Kotlin",
  "Scala",
  "Haskell",
  "Elixir",
  "Clojure",
  "Dart",
  "Lua",
  "R",
  "Julia",
  "Zig",
  "Nim",
  "OCaml",
  "Erlang",
  "Perl",
  "Bash",
  "SQL",
  "HTML",
  "CSS",
];

/**
 * Example: Combobox creatable with a confirmation dialog.
 * Demonstrates awaiting user input in onCreateItem via Promise.
 */
const CreatableWithDialog = ({
  items,
  onItemsChange,
}: {
  items: { id: string; name: string }[];
  onItemsChange: React.Dispatch<React.SetStateAction<{ id: string; name: string }[]>>;
}) => {
  const [dialogState, setDialogState] = React.useState<{
    open: boolean;
    value: string;
    resolve: (result: { id: string; name: string } | false) => void;
  } | null>(null);

  return (
    <>
      <Combobox
        items={items}
        mapItem={(item) => ({ label: item.name, key: item.id })}
        onCreateItem={(value) =>
          new Promise<{ id: string; name: string } | false>((resolve) => {
            setDialogState({ open: true, value, resolve });
          })
        }
        placeholder="Search or create (with confirm)..."
      />
      <Dialog.Root
        open={dialogState?.open ?? false}
        onOpenChange={(open) => {
          if (!open && dialogState) {
            dialogState.resolve(false);
            setDialogState(null);
          }
        }}
      >
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Create new item</Dialog.Title>
            <Dialog.Description>
              Are you sure you want to create &quot;{dialogState?.value}&quot;?
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Footer>
            <Button
              variant="outline"
              onClick={() => {
                dialogState?.resolve(false);
                setDialogState(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (dialogState) {
                  const item = {
                    id: crypto.randomUUID(),
                    name: dialogState.value,
                  };
                  onItemsChange((prev) => [...prev, item]);
                  dialogState.resolve(item);
                  setDialogState(null);
                }
              }}
            >
              Create
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
};

const DropdownComponentsDemoPage = () => {
  const [selectedFruits, setSelectedFruits] = React.useState<Fruit[]>([]);
  const [creatableItems, setCreatableItems] = React.useState<{ id: string; name: string }[]>([
    { id: "1", name: "React" },
    { id: "2", name: "Vue" },
    { id: "3", name: "Angular" },
    { id: "4", name: "Svelte" },
  ]);

  const cardStyle: React.CSSProperties = {
    padding: "1.5rem",
    borderRadius: "0.75rem",
    border: "1px solid var(--border)",
    backgroundColor: "var(--card)",
    color: "var(--card-foreground)",
  };
  const headingStyle: React.CSSProperties = {
    fontWeight: "bold",
    marginBottom: "0.75rem",
    fontSize: "1.125rem",
  };
  const subHeadingStyle: React.CSSProperties = {
    fontWeight: 600,
    marginBottom: "0.5rem",
    fontSize: "0.875rem",
    color: "var(--muted-foreground)",
  };
  const sectionStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  };
  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "1.5rem",
  };

  return (
    <Layout>
      <Layout.Header title="Select / Combobox / Autocomplete" />
      <Layout.Column>
        {/* ── Select ── */}
        <div style={cardStyle}>
          <h3 style={headingStyle}>Select</h3>
          <div style={gridStyle}>
            {/* Basic (string items) */}
            <div style={sectionStyle}>
              <div style={subHeadingStyle}>Basic</div>
              <Select items={["Apple", "Banana", "Cherry", "Grape"]} placeholder="Pick a fruit" />
            </div>

            {/* Custom render */}
            <div style={sectionStyle}>
              <div style={subHeadingStyle}>Custom render</div>
              <Select
                items={fruits}
                mapItem={(f) => ({
                  label: f.name,
                  key: f.id,
                  render: (
                    <span>
                      {f.emoji} {f.name}
                    </span>
                  ),
                })}
                placeholder="With emoji"
              />
            </div>

            {/* Multiple selection */}
            <div style={sectionStyle}>
              <div style={subHeadingStyle}>Multiple</div>
              <Select
                items={fruits}
                mapItem={(f) => ({ label: f.name, key: f.id })}
                multiple
                value={selectedFruits}
                onValueChange={setSelectedFruits}
                placeholder="Pick fruits"
              />
            </div>

            {/* Grouped items */}
            <div style={sectionStyle}>
              <div style={subHeadingStyle}>Grouped</div>
              <Select
                items={groupedFruits}
                mapItem={(f) => ({ label: f.name, key: f.id })}
                placeholder="Grouped select"
              />
            </div>

            {/* Disabled */}
            <div style={sectionStyle}>
              <div style={subHeadingStyle}>Disabled</div>
              <Select items={["Apple", "Banana"]} placeholder="Disabled" disabled />
            </div>
          </div>
        </div>

        {/* ── Select.Async ── */}
        <div style={cardStyle}>
          <h3 style={headingStyle}>Select.Async</h3>
          <div style={gridStyle}>
            <div style={sectionStyle}>
              <div style={subHeadingStyle}>Single</div>
              <Select.Async
                fetcher={async () => {
                  await new Promise((r) => setTimeout(r, 800));
                  return fruits;
                }}
                mapItem={(f) => ({
                  label: f.name,
                  key: f.id,
                  render: (
                    <span>
                      {f.emoji} {f.name}
                    </span>
                  ),
                })}
                placeholder="Async select..."
                loadingText="Loading fruits..."
              />
            </div>

            <div style={sectionStyle}>
              <div style={subHeadingStyle}>Multiple</div>
              <Select.Async
                fetcher={async () => {
                  await new Promise((r) => setTimeout(r, 800));
                  return fruits;
                }}
                mapItem={(f) => ({ label: f.name, key: f.id })}
                multiple
                placeholder="Async multi-select..."
              />
            </div>
          </div>
        </div>

        {/* ── Combobox ── */}
        <div style={cardStyle}>
          <h3 style={headingStyle}>Combobox</h3>
          <div style={gridStyle}>
            {/* Basic string items */}
            <div style={sectionStyle}>
              <div style={subHeadingStyle}>Basic</div>
              <Combobox
                items={["Apple", "Banana", "Cherry", "Grape", "Mango", "Orange"]}
                placeholder="Search fruit..."
              />
            </div>

            {/* Custom render */}
            <div style={sectionStyle}>
              <div style={subHeadingStyle}>Custom render</div>
              <Combobox
                items={fruits}
                mapItem={(f) => ({
                  label: f.name,
                  key: f.id,
                  render: (
                    <span>
                      {f.emoji} {f.name}
                    </span>
                  ),
                })}
                placeholder="With emoji"
              />
            </div>

            {/* Multiple */}
            <div style={sectionStyle}>
              <div style={subHeadingStyle}>Multiple (chips)</div>
              <Combobox
                items={fruits}
                mapItem={(f) => ({ label: f.name, key: f.id })}
                multiple
                placeholder="Add fruits..."
              />
            </div>

            {/* Grouped */}
            <div style={sectionStyle}>
              <div style={subHeadingStyle}>Grouped</div>
              <Combobox
                items={groupedFruits}
                mapItem={(f) => ({ label: f.name, key: f.id })}
                placeholder="Search grouped..."
              />
            </div>

            {/* Disabled */}
            <div style={sectionStyle}>
              <div style={subHeadingStyle}>Disabled</div>
              <Combobox items={["Apple", "Banana"]} placeholder="Disabled" disabled />
            </div>
          </div>
        </div>

        {/* ── Combobox.Async ── */}
        <div style={cardStyle}>
          <h3 style={headingStyle}>Combobox.Async</h3>
          <div style={gridStyle}>
            <div style={sectionStyle}>
              <div style={subHeadingStyle}>Single</div>
              <Combobox.Async
                fetcher={async (query) => {
                  await new Promise((r) => setTimeout(r, 400));
                  return allProgrammingLanguages.filter((l) =>
                    l.toLowerCase().includes(query.toLowerCase()),
                  );
                }}
                placeholder="Search programming language..."
                loadingText="Searching..."
                emptyText="No programming languages found."
              />
            </div>

            <div style={sectionStyle}>
              <div style={subHeadingStyle}>Multiple</div>
              <Combobox.Async
                fetcher={async (query) => {
                  await new Promise((r) => setTimeout(r, 400));
                  return allProgrammingLanguages.filter((l) =>
                    l.toLowerCase().includes(query.toLowerCase()),
                  );
                }}
                multiple
                placeholder="Add programming languages..."
              />
            </div>
          </div>
        </div>

        {/* ── Combobox (creatable) ── */}
        <div style={cardStyle}>
          <h3 style={headingStyle}>Combobox (creatable)</h3>
          <div style={gridStyle}>
            <div style={sectionStyle}>
              <div style={subHeadingStyle}>Single</div>
              <Combobox
                items={creatableItems}
                mapItem={(item) => ({ label: item.name, key: item.id })}
                onCreateItem={async (value) => {
                  const item = { id: crypto.randomUUID(), name: value };
                  setCreatableItems((prev) => [...prev, item]);
                  return item;
                }}
                formatCreateLabel={(v) => `Create "${v}"`}
                placeholder="Search or create..."
              />
            </div>

            <div style={sectionStyle}>
              <div style={subHeadingStyle}>Multiple (async)</div>
              <Combobox
                items={creatableItems}
                mapItem={(item) => ({ label: item.name, key: item.id })}
                onCreateItem={async (value) => {
                  await new Promise((r) => setTimeout(r, 500));
                  const item = { id: crypto.randomUUID(), name: value };
                  setCreatableItems((prev) => [...prev, item]);
                  return item;
                }}
                multiple
                placeholder="Add or create tags..."
              />
            </div>

            <div style={sectionStyle}>
              <div style={subHeadingStyle}>With confirmation dialog</div>
              <CreatableWithDialog items={creatableItems} onItemsChange={setCreatableItems} />
            </div>
          </div>
        </div>

        {/* ── Autocomplete ── */}
        <div style={cardStyle}>
          <h3 style={headingStyle}>Autocomplete</h3>
          <div style={gridStyle}>
            {/* Basic string items */}
            <div style={sectionStyle}>
              <div style={subHeadingStyle}>Basic</div>
              <Autocomplete
                items={["Apple", "Banana", "Cherry", "Grape", "Mango", "Orange"]}
                placeholder="Type a fruit..."
              />
            </div>

            {/* Custom render */}
            <div style={sectionStyle}>
              <div style={subHeadingStyle}>Custom render</div>
              <Autocomplete
                items={fruits}
                mapItem={(f) => ({
                  label: f.name,
                  key: f.id,
                  render: (
                    <span>
                      {f.emoji} {f.name}
                    </span>
                  ),
                })}
                placeholder="With emoji"
              />
            </div>

            {/* Grouped */}
            <div style={sectionStyle}>
              <div style={subHeadingStyle}>Grouped</div>
              <Autocomplete
                items={groupedFruits}
                mapItem={(f) => ({ label: f.name, key: f.id })}
                placeholder="Grouped autocomplete..."
              />
            </div>
          </div>
        </div>

        {/* ── Autocomplete.Async ── */}
        <div style={cardStyle}>
          <h3 style={headingStyle}>Autocomplete.Async</h3>
          <div style={gridStyle}>
            <div style={sectionStyle}>
              <div style={subHeadingStyle}>Async search</div>
              <Autocomplete.Async
                fetcher={async (query) => {
                  await new Promise((r) => setTimeout(r, 400));
                  return allProgrammingLanguages.filter((l) =>
                    l.toLowerCase().includes(query.toLowerCase()),
                  );
                }}
                placeholder="Search programming language..."
              />
            </div>
          </div>
        </div>
      </Layout.Column>
    </Layout>
  );
};

const dropdownComponentsDemoResource = defineResource({
  path: "dropdown-demo",
  meta: {
    title: "Dropdown Components Demo",
  },
  component: DropdownComponentsDemoPage,
});

export const customPageModule = defineModule({
  path: "custom-page",
  component: (pageProps: ResourceComponentProps) => {
    const t = useT();

    return (
      <div>
        <h2 style={{ fontWeight: "bold" }}>{pageProps.title}</h2>
        <div style={{ paddingTop: "1rem" }}>
          <p>
            <Link to="/custom-page/sub1">{t("goToSub1")}</Link>
          </p>
          <p>
            <Link to="/custom-page/sub1/sub1-1">{t("goToSub1-1")}</Link>
          </p>
          <p>
            <Link to="/custom-page/sub1/sub1-1/123">{t("goToDynamicPage")}</Link>
          </p>
          <p>
            <Link
              to="/custom-page/purchase-order-demo"
              style={{
                color: "hsl(var(--primary))",
                textDecoration: "underline",
              }}
            >
              View Purchase Order Demo (DescriptionCard)
            </Link>
          </p>
          <p>
            <Link
              to="/custom-page/action-panel-demo"
              style={{
                color: "hsl(var(--primary))",
                textDecoration: "underline",
              }}
            >
              View Action Panel Demo
            </Link>
          </p>
          <p>
            <Link
              to="/custom-page/metric-card-demo"
              style={{
                color: "hsl(var(--primary))",
                textDecoration: "underline",
              }}
            >
              View MetricCard Demo (KPI cards)
            </Link>
          </p>
          <p>
            <Link
              to="/custom-page/activity-card-demo"
              style={{
                color: "hsl(var(--primary))",
                textDecoration: "underline",
              }}
            >
              View ActivityCard Demo
            </Link>
          </p>
          <p>
            <Link
              to="/custom-page/layout-1-column"
              style={{
                color: "hsl(var(--primary))",
                textDecoration: "underline",
              }}
            >
              View 1 Column Layout Demo
            </Link>
          </p>
          <p>
            <Link
              to="/custom-page/layout-2-columns"
              style={{
                color: "hsl(var(--primary))",
                textDecoration: "underline",
              }}
            >
              View 2 Columns Layout Demo
            </Link>
          </p>
          <p>
            <Link
              to="/custom-page/layout-3-columns"
              style={{
                color: "hsl(var(--primary))",
                textDecoration: "underline",
              }}
            >
              View 3 Columns Layout Demo
            </Link>
          </p>
          <p>
            <Link
              to="/custom-page/layout-slots-demo"
              style={{
                color: "hsl(var(--primary))",
                textDecoration: "underline",
              }}
            >
              View Layout Slots Demo
            </Link>
          </p>
          <p>
            <Link
              to="/custom-page/admin-only"
              style={{
                color: "hsl(var(--destructive))",
                textDecoration: "underline",
              }}
            >
              🔒 Admin Only Page (Restricted)
            </Link>
          </p>
          <p>
            <Link
              to="/custom-page/primitives-demo"
              style={{
                color: "hsl(var(--primary))",
                textDecoration: "underline",
              }}
            >
              Primitive Components Demo (Button, Input, Menu, Table, Dialog, Sheet, Tooltip)
            </Link>
          </p>
          <p>
            <Link
              to="/custom-page/dropdown-demo"
              style={{
                color: "hsl(var(--primary))",
                textDecoration: "underline",
              }}
            >
              Dropdown Components Demo (Select, Combobox, Autocomplete)
            </Link>
          </p>
        </div>
      </div>
    );
  },
  meta: {
    title: labels.t("customPageTitle"),
    icon: <ZapIcon />,
  },
  resources: [
    subPageResource,
    hiddenResource,
    adminOnlyResource,
    purchaseOrderDemoResource,
    actionPanelDemoResource,
    metricCardDemoResource,
    activityCardDemoResource,
    oneColumnLayoutResource,
    twoColumnLayoutResource,
    threeColumnLayoutResource,
    layoutSlotsDemoResource,
    primitiveComponentsDemoResource,
    dropdownComponentsDemoResource,
  ],
});
