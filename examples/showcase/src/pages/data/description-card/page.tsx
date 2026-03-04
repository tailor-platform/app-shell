import { DescriptionCard } from "@tailor-platform/app-shell";
import { Section, mockOrder } from "../../../shared";

const DescriptionCardPage = () => {
  return (
    <div
      style={{
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      <Section title="DescriptionCard">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
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

          <DescriptionCard
            data={mockOrder}
            title="Order Details"
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
              {
                key: "note",
                label: "Notes",
                meta: { truncateLines: 3 },
              },
            ]}
          />

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
      </Section>
    </div>
  );
};

export default DescriptionCardPage;
