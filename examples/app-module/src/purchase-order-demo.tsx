import { defineResource, DescriptionCard } from "@tailor-platform/app-shell";

// ============================================================================
// Mock Data
// ============================================================================

export const mockPurchaseOrder = {
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
  subtotal: 12500.0,
  tax: 1031.25,
  total: 13531.25,
};

// ============================================================================
// Purchase Order Detail Page
// ============================================================================

const PurchaseOrderDetailPage = () => {
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

export const purchaseOrderDemoResource = defineResource({
  path: "purchase-order-demo",
  meta: {
    title: "Purchase Order Demo",
  },
  component: PurchaseOrderDetailPage,
});
