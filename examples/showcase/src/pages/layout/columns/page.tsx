import {
  Layout,
  Button,
  DescriptionCard,
  Tabs,
} from "@tailor-platform/app-shell";
import { mockOrder, Section } from "../../../shared";

const generalFields = [
  {
    key: "docNumber" as const,
    label: "PO Number",
    meta: { copyable: true },
  },
  { key: "supplierName" as const, label: "Supplier" },
  {
    key: "status" as const,
    label: "Status",
    type: "badge" as const,
    meta: {
      badgeVariantMap: { CONFIRMED: "success" as const },
    },
  },
];

const financialFields = [
  {
    key: "subtotal" as const,
    label: "Subtotal",
    type: "money" as const,
    meta: { currencyKey: "currency.code" },
  },
  {
    key: "tax" as const,
    label: "Tax",
    type: "money" as const,
    meta: { currencyKey: "currency.code" },
  },
  {
    key: "total" as const,
    label: "Total",
    type: "money" as const,
    meta: { currencyKey: "currency.code" },
  },
];

const shippingFields = [
  { key: "shipToLocation.name" as const, label: "Warehouse" },
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

const actions = [
  <Button key="cancel" variant="secondary" size="sm">
    Cancel
  </Button>,
  <Button key="save" size="sm">
    Save
  </Button>,
];

const LayoutColumnsPage = () => {
  return (
    <Tabs.Root defaultValue="2">
      <div className="astw:pt-4">
        <Tabs.List>
          <Tabs.Trigger value="1">1 Column</Tabs.Trigger>
          <Tabs.Trigger value="2">2 Columns</Tabs.Trigger>
          <Tabs.Trigger value="3">3 Columns</Tabs.Trigger>
        </Tabs.List>
      </div>

      <Tabs.Content value="1">
        <Layout columns={1} title="Order Detail" actions={actions}>
          <Layout.Column>
            <DescriptionCard
              data={mockOrder}
              title="General"
              columns={3}
              fields={generalFields}
            />
          </Layout.Column>
        </Layout>
      </Tabs.Content>

      <Tabs.Content value="2">
        <Layout columns={2} title="Order Detail" actions={actions}>
          <Layout.Column>
            <DescriptionCard
              data={mockOrder}
              title="General"
              columns={3}
              fields={generalFields}
            />
          </Layout.Column>
          <Layout.Column>
            <DescriptionCard
              data={mockOrder}
              title="Financials"
              columns={3}
              fields={financialFields}
            />
          </Layout.Column>
        </Layout>
      </Tabs.Content>

      <Tabs.Content value="3">
        <Layout columns={3} title="Order Detail" actions={actions}>
          <Layout.Column>
            <DescriptionCard
              data={mockOrder}
              title="General"
              columns={3}
              fields={generalFields}
            />
          </Layout.Column>
          <Layout.Column>
            <DescriptionCard
              data={mockOrder}
              title="Financials"
              columns={3}
              fields={financialFields}
            />
          </Layout.Column>
          <Layout.Column>
            <DescriptionCard
              data={mockOrder}
              title="Shipping"
              columns={3}
              fields={shippingFields}
            />
          </Layout.Column>
        </Layout>
      </Tabs.Content>
    </Tabs.Root>
  );
};

export default LayoutColumnsPage;
