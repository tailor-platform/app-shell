import {
  defineResource,
  DescriptionCard,
  Layout,
} from "@tailor-platform/app-shell";
import * as React from "react";
import { mockPurchaseOrder } from "./purchase-order-demo";

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
// Shared DescriptionCard fields for Order Overview
// ============================================================================

const orderOverviewFields = [
  { key: "docNumber" as const, label: "PO Number", meta: { copyable: true } },
  {
    key: "externalReference" as const,
    label: "External Ref",
    meta: { copyable: true },
  },
  { key: "supplierName" as const, label: "Supplier" },
  { type: "divider" as const },
  {
    key: "expectedDeliveryDate" as const,
    label: "Expected Delivery",
    type: "date" as const,
    meta: { dateFormat: "medium" as const },
  },
  {
    key: "confirmedAt" as const,
    label: "Confirmed",
    type: "date" as const,
    meta: { dateFormat: "medium" as const },
  },
  {
    key: "createdAt" as const,
    label: "Created",
    type: "date" as const,
    meta: { dateFormat: "relative" as const },
  },
  { key: "shipToLocation.name" as const, label: "Warehouse" },
  { type: "divider" as const },
  {
    key: "shipToLocation.address" as const,
    label: "Shipping Address",
    type: "address" as const,
    meta: { copyable: true },
  },
  {
    key: "note" as const,
    label: "Notes",
    meta: { truncateLines: 3 },
  },
];

// ============================================================================
// Layout Demo Resources
// ============================================================================

export const oneColumnLayoutResource = defineResource({
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
            fields={orderOverviewFields}
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
            fields={orderOverviewFields}
          />
        </Layout.Column>
        <Layout.Column>
          <Placeholder columnNumber={2} />
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
      <Layout columns={3} title="3 Columns">
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
    );
  },
});
