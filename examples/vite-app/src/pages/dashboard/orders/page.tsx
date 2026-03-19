import {
  Link,
  Button,
  Layout,
  Table,
  Badge,
  type AppShellPageProps,
} from "@tailor-platform/app-shell";
import { paths } from "../../../routes.generated";

const statusVariant = (status: string) => {
  switch (status) {
    case "Shipped":
      return "outline-info" as const;
    case "Processing":
      return "outline-warning" as const;
    case "Delivered":
      return "success" as const;
    default:
      return "neutral" as const;
  }
};

const OrdersPage = () => {
  const orders = [
    {
      id: "order-001",
      name: "Office Supplies",
      status: "Shipped",
      amount: "$1,200.00",
    },
    {
      id: "order-002",
      name: "Electronics",
      status: "Processing",
      amount: "$3,450.00",
    },
    {
      id: "order-003",
      name: "Furniture",
      status: "Delivered",
      amount: "$8,900.00",
    },
  ];

  return (
    <Layout>
      <Layout.Header title="Orders" />
      <Layout.Column>
        <p className="mb-4 text-muted-foreground">
          This page is at{" "}
          <code className="bg-muted px-2 py-0.5 rounded">src/pages/dashboard/orders/page.tsx</code>
        </p>
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Order ID</Table.Head>
              <Table.Head>Name</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head>Amount</Table.Head>
              <Table.Head />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {orders.map((order) => (
              <Table.Row key={order.id}>
                <Table.Cell>{order.id}</Table.Cell>
                <Table.Cell>{order.name}</Table.Cell>
                <Table.Cell>
                  <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
                </Table.Cell>
                <Table.Cell>{order.amount}</Table.Cell>
                <Table.Cell>
                  <Button
                    variant="ghost"
                    size="sm"
                    render={
                      <Link
                        to={paths.for("/dashboard/orders/:id", {
                          id: order.id,
                        })}
                      />
                    }
                  >
                    View →
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Layout.Column>
    </Layout>
  );
};

OrdersPage.appShellPageProps = {
  meta: {
    title: "Orders",
  },
} satisfies AppShellPageProps;

export default OrdersPage;
