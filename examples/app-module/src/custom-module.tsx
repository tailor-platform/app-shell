import {
  defineModule,
  defineResource,
  Link,
  ResourceComponentProps,
  useParams,
  hidden,
  pass,
  DescriptionCard,
  Layout,
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        padding: "1.5rem",
      }}
    >
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
    </div>
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
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
            Admin Only Page
          </h1>
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
            This page is only visible when you select <strong>"Admin"</strong>{" "}
            role from the sidebar.
          </p>
          <p
            style={{
              color: "hsl(var(--muted-foreground))",
              fontSize: "0.875rem",
            }}
          >
            Try switching to "Staff" role - this page will disappear from the
            navigation and become inaccessible.
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
            <li>
              The navigation automatically hides resources that are guarded
            </li>
          </ul>
        </div>
      </div>
    );
  },
});

// ============================================================================
// BUTTON COMPONENT (Demo component for Layout examples)
// ============================================================================

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary";
  size?: "default" | "sm";
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className = "", variant = "default", size = "default", ...props },
    ref,
  ) => {
    const baseClasses =
      "astw:inline-flex astw:items-center astw:justify-center astw:whitespace-nowrap astw:rounded-md astw:text-sm astw:font-medium astw:transition-all astw:disabled:pointer-events-none astw:disabled:opacity-50 astw:outline-none astw:focus-visible:border-ring astw:focus-visible:ring-ring/50 astw:focus-visible:ring-[3px]";

    const variantClasses =
      variant === "secondary"
        ? "astw:bg-secondary astw:text-secondary-foreground astw:shadow-xs astw:hover:bg-secondary/80"
        : "astw:bg-primary astw:text-primary-foreground astw:shadow-xs astw:hover:bg-primary/90";

    const sizeClasses =
      size === "sm"
        ? "astw:h-8 astw:gap-1.5 astw:px-3"
        : "astw:h-9 astw:gap-2 astw:px-4 astw:py-2";

    return (
      <button
        ref={ref}
        className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

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

const oneColumnLayoutResource = defineResource({
  path: "layout-1-column",
  meta: {
    title: "1 Column",
  },
  component: () => {
    return (
      <Layout columns={1} title="1 Column">
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
    return (
      <Layout
        columns={2}
        title="2 Columns"
        actions={[
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
        ]}
      >
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
          <Placeholder columnNumber={2} />
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
      <Layout columns={3} title="3 Columns">
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
            <Link to="/custom-page/sub1/sub1-1/123">
              {t("goToDynamicPage")}
            </Link>
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
              to="/custom-page/admin-only"
              style={{
                color: "hsl(var(--destructive))",
                textDecoration: "underline",
              }}
            >
              🔒 Admin Only Page (Restricted)
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
    oneColumnLayoutResource,
    twoColumnLayoutResource,
    threeColumnLayoutResource,
  ],
});
