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
  Layout,
  Button,
  Input,
  Table,
  Dialog,
  Sheet,
  Tooltip,
  Badge,
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
                  <Tooltip.Content side="top">Tooltip on top</Tooltip.Content>
                </Tooltip.Root>
                <Tooltip.Root>
                  <Tooltip.Trigger render={<Button variant="outline" />}>Bottom</Tooltip.Trigger>
                  <Tooltip.Content side="bottom">Tooltip on bottom</Tooltip.Content>
                </Tooltip.Root>
                <Tooltip.Root>
                  <Tooltip.Trigger render={<Button variant="outline" />}>Left</Tooltip.Trigger>
                  <Tooltip.Content side="left">Tooltip on left</Tooltip.Content>
                </Tooltip.Root>
                <Tooltip.Root>
                  <Tooltip.Trigger render={<Button variant="outline" />}>Right</Tooltip.Trigger>
                  <Tooltip.Content side="right">Tooltip on right</Tooltip.Content>
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
              Primitive Components Demo (Button, Input, Table, Dialog, Sheet, Tooltip)
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
    oneColumnLayoutResource,
    twoColumnLayoutResource,
    threeColumnLayoutResource,
    layoutSlotsDemoResource,
    primitiveComponentsDemoResource,
  ],
});
