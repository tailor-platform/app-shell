/* app-shell-scaffold: resource/list scaffold banner. */
/* pattern: list/dense-scan */
import { Button, Layout, Link, type AppShellPageProps } from "@tailor-platform/app-shell";
import { ListTable } from "./components/purchase-orders-table";

const Page = () => {
  return (
    <Layout fill>
      <Layout.Header
        title="Purchase Orders"
        actions={[
          <Button key="create" render={<Link to="create" />}>
            Create purchase order
          </Button>,
        ]}
      />
      <Layout.Column>
        <ListTable />
      </Layout.Column>
    </Layout>
  );
};

Page.appShellPageProps = {
  meta: { title: "Purchase Orders" },
} satisfies AppShellPageProps;

export default Page;
