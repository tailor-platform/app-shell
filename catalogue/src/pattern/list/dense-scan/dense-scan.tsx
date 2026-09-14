/* pattern: list/dense-scan */
import { Button, Layout, Link } from "@tailor-platform/app-shell";
import { OrdersTable } from "./orders-table";

export default function OrdersListPage() {
  return (
    <Layout fill>
      <Layout.Header
        title="Orders"
        actions={[
          <Button key="create" render={<Link to="create" />}>
            Create order
          </Button>,
        ]}
      />
      <Layout.Column>
        <OrdersTable />
      </Layout.Column>
    </Layout>
  );
}
