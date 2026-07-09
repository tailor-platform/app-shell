import { DocumentProgressCard } from "@tailor-platform/app-shell";

export function DocumentProgressCardExample() {
  return (
    <DocumentProgressCard
      title="Shipment status"
      percent={60}
      segments={[
        { label: "Shipped", value: 30, color: "green" },
        { label: "Returned", value: 3, color: "red" },
        { label: "Pending", value: 17, color: "neutral" },
      ]}
    />
  );
}
