import { DescriptionCard } from "@tailor-platform/app-shell";

const orderData = {
  orderNumber: "ORD-12345",
  customer: "Acme Corporation",
  status: "shipped",
  totalAmount: 15750.0,
  currency: "USD",
  orderDate: "2026-03-01T10:00:00Z",
};

export function BasicUsage() {
  return (
    <DescriptionCard
      data={orderData}
      title="Order details"
      fields={[
        { key: "orderNumber", label: "Order Number" },
        { key: "customer", label: "Customer" },
        { key: "status", label: "Status", type: "badge" },
        { key: "totalAmount", label: "Total", type: "money", meta: { currencyKey: "currency" } },
        { key: "orderDate", label: "Order Date", type: "date" },
      ]}
    />
  );
}

export function ArrayBadges() {
  return (
    <DescriptionCard
      title="Shipping tags"
      data={{ tags: ["urgent", "fragile", "international"] }}
      fields={[
        {
          key: "tags",
          label: "Tags",
          type: "badge",
          meta: {
            badgeVariantMap: { urgent: "error", fragile: "warning", international: "outline-info" },
            maxVisible: 2,
          },
        },
      ]}
    />
  );
}

export function NestedData() {
  const data = {
    customer: {
      name: "Example Customer",
      contact: { email: "contact@example.com" },
    },
  };

  return (
    <DescriptionCard
      title="Customer details"
      data={data}
      fields={[
        { key: "customer.name", label: "Customer Name" },
        { key: "customer.contact.email", label: "Email" },
      ]}
    />
  );
}

export function CompleteExample() {
  const orderData = {
    orderNumber: "ORD-12345",
    orderDate: "2026-03-01T10:00:00Z",
    status: "shipped",
    customer: {
      name: "Example Customer",
      id: "CUST-001",
      email: "orders@example.com",
      emailUrl: "mailto:orders@example.com",
    },
    subtotal: 14000,
    tax: 1750,
    total: 15750,
    currency: "USD",
    shippingAddress: {
      street: "123 Business Ave",
      city: "San Francisco",
      state: "CA",
      zip: "94105",
    },
    trackingNumber: "1Z999AA10123456784",
    notes: "Rush delivery requested",
  };

  return (
    <DescriptionCard
      title="Order details"
      data={orderData}
      columns={3}
      fields={[
        { key: "orderNumber", label: "Order Number", meta: { copyable: true } },
        { key: "orderDate", label: "Order Date", type: "date", meta: { dateFormat: "medium" } },
        {
          key: "status",
          label: "Status",
          type: "badge",
          meta: {
            badgeVariantMap: {
              draft: "neutral",
              pending: "subtle-warning",
              shipped: "subtle-success",
              delivered: "success",
              cancelled: "subtle-error",
            },
          },
        },
        { type: "divider" },
        {
          key: "customer.name",
          label: "Customer",
          type: "reference",
          meta: {
            referenceIdKey: "customer.id",
            referenceUrlPattern: "/components/description-card?customer={id}",
          },
        },
        {
          key: "customer.email",
          label: "Email",
          type: "link",
          meta: { hrefKey: "customer.emailUrl", external: true },
        },
        { type: "divider" },
        { key: "subtotal", label: "Subtotal", type: "money", meta: { currencyKey: "currency" } },
        { key: "tax", label: "Tax", type: "money", meta: { currencyKey: "currency" } },
        { key: "total", label: "Total", type: "money", meta: { currencyKey: "currency" } },
        { type: "divider" },
        { key: "shippingAddress", label: "Shipping Address", type: "address" },
        { key: "trackingNumber", label: "Tracking", meta: { copyable: true } },
        { type: "divider" },
        { key: "notes", label: "Notes", meta: { truncateLines: 2 }, emptyBehavior: "hide" },
      ]}
    />
  );
}
