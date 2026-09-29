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
