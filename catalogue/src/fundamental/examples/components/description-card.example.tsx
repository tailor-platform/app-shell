import { DescriptionCard } from "@tailor-platform/app-shell";

const order = {
  number: "PO-1234",
  status: "Confirmed",
  createdAt: "2026-07-09",
};

export function DescriptionCardExample() {
  return (
    <DescriptionCard
      title="Order details"
      data={order}
      columns={3}
      fields={[
        { key: "number", label: "Order number" },
        {
          key: "status",
          label: "Status",
          type: "badge",
          meta: { badgeVariantMap: { Confirmed: "success" } },
        },
        { key: "createdAt", label: "Created", type: "date", meta: { dateFormat: "short" } },
      ]}
    />
  );
}
