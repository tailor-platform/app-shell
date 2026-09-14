import { Layout, type AppShellPageProps } from "@tailor-platform/app-shell";

const CreatePurchaseOrderPage = () => {
  return (
    <Layout>
      <Layout.Header title="Create purchase order" />
      <Layout.Column>
        <p className="text-sm text-muted-foreground">
          Placeholder route so the generated list scaffold's create link has somewhere to land.
        </p>
      </Layout.Column>
    </Layout>
  );
};

CreatePurchaseOrderPage.appShellPageProps = {
  meta: { title: "Create purchase order" },
} satisfies AppShellPageProps;

export default CreatePurchaseOrderPage;
