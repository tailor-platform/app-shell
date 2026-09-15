import { Layout, useParams, type AppShellPageProps } from "@tailor-platform/app-shell";

const OrderActivityPage = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <Layout>
      <Layout.Header title={`Order activity: ${id}`} />
      <Layout.Column>
        <p className="text-muted-foreground">
          This child route is available from the command palette only while an order ID is in the
          current URL.
        </p>
      </Layout.Column>
    </Layout>
  );
};

OrderActivityPage.appShellPageProps = {
  meta: { title: "Order Activity" },
} satisfies AppShellPageProps;

export default OrderActivityPage;
