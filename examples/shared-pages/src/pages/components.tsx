import { DescriptionCard, Layout } from "@tailor-platform/app-shell";
import * as React from "react";
import type { SVGProps } from "react";

// ============================================================================
// Icons
// ============================================================================

export const LayoutIcon = (props: SVGProps<SVGSVGElement>) => {
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
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );
};

// ============================================================================
// Shared Mock Data (for DescriptionCard demos inside Layout)
// ============================================================================

const mockOrder = {
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
  note: "Rush order - priority shipping requested. Please ensure all items are inspected before acceptance.",
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
  subtotal: 12500.0,
  tax: 1031.25,
  total: 13531.25,
};

const orderFields = [
  { key: "docNumber", label: "PO Number", meta: { copyable: true } } as const,
  {
    key: "externalReference",
    label: "External Ref",
    meta: { copyable: true },
  } as const,
  { key: "supplierName", label: "Supplier" } as const,
  { type: "divider" } as const,
  {
    key: "expectedDeliveryDate",
    label: "Expected Delivery",
    type: "date",
    meta: { dateFormat: "medium" },
  } as const,
  {
    key: "confirmedAt",
    label: "Confirmed",
    type: "date",
    meta: { dateFormat: "medium" },
  } as const,
  {
    key: "createdAt",
    label: "Created",
    type: "date",
    meta: { dateFormat: "relative" },
  } as const,
  { key: "shipToLocation.name", label: "Warehouse" } as const,
  { type: "divider" } as const,
  {
    key: "shipToLocation.address",
    label: "Shipping Address",
    type: "address",
    meta: { copyable: true },
  } as const,
  { key: "note", label: "Notes", meta: { truncateLines: 3 } } as const,
];

// ============================================================================
// Button (demo component for Layout examples)
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
// Placeholder (for column demos)
// ============================================================================

const Placeholder = ({ columnNumber }: { columnNumber: number }) => {
  return (
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
};

// ============================================================================
// DescriptionCard Demo Page
// ============================================================================

export const DescriptionCardDemoPage = () => {
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
        DescriptionCard Demo
      </h1>
      <p
        style={{
          color: "hsl(var(--muted-foreground))",
          marginBottom: "0.5rem",
        }}
      >
        Demonstrates DescriptionCard with various field types: text, badge,
        money, date, address, copyable fields, and dividers.
      </p>

      {/* Status Overview Card */}
      <DescriptionCard
        data={mockOrder}
        title="Status Overview"
        columns={4}
        fields={[
          {
            key: "status",
            label: "Status",
            type: "badge",
            meta: {
              badgeVariantMap: {
                DRAFT: "outline-neutral",
                CONFIRMED: "success",
                CLOSED: "outline-success",
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
        data={mockOrder}
        title="Order Overview"
        columns={4}
        fields={orderFields}
      />

      {/* Financial Summary Card */}
      <DescriptionCard
        data={mockOrder}
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

// ============================================================================
// Layout Demo Pages
// ============================================================================

export const OneColumnLayoutPage = () => {
  return (
    <Layout columns={1} title="1 Column">
      <Layout.Column>
        <DescriptionCard
          data={mockOrder}
          title="Order Overview"
          columns={4}
          fields={orderFields}
        />
      </Layout.Column>
    </Layout>
  );
};

export const TwoColumnLayoutPage = () => {
  return (
    <Layout
      columns={2}
      title="2 Columns"
      actions={[
        <Button
          key="cancel"
          variant="secondary"
          size="sm"
          onClick={() => alert("Secondary button clicked!")}
        >
          Cancel
        </Button>,
        <Button
          key="action"
          size="sm"
          onClick={() => alert("Primary button clicked!")}
        >
          Action
        </Button>,
      ]}
    >
      <Layout.Column>
        <DescriptionCard
          data={mockOrder}
          title="Order Overview"
          columns={4}
          fields={orderFields}
        />
      </Layout.Column>
      <Layout.Column>
        <Placeholder columnNumber={2} />
      </Layout.Column>
    </Layout>
  );
};

export const ThreeColumnLayoutPage = () => {
  return (
    <Layout columns={3} title="3 Columns">
      <Layout.Column>
        <Placeholder columnNumber={1} />
      </Layout.Column>
      <Layout.Column>
        <DescriptionCard
          data={mockOrder}
          title="Order Overview"
          columns={4}
          fields={orderFields}
        />
      </Layout.Column>
      <Layout.Column>
        <Placeholder columnNumber={3} />
      </Layout.Column>
    </Layout>
  );
};
