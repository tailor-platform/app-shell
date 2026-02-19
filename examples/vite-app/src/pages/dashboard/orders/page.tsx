import { Link, type AppShellPageProps } from "@tailor-platform/app-shell";
import { paths } from "../../../routes.generated";

const OrdersPage = () => {
  const orders = [
    { id: "order-001", name: "Office Supplies", status: "Shipped" },
    { id: "order-002", name: "Electronics", status: "Processing" },
    { id: "order-003", name: "Furniture", status: "Delivered" },
  ];

  return (
    <div style={{ padding: "1.5rem" }}>
      <h1
        style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}
      >
        Orders
      </h1>
      <p
        style={{ marginBottom: "1rem", color: "hsl(var(--muted-foreground))" }}
      >
        This page is at <code>src/pages/dashboard/orders/page.tsx</code>
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {orders.map((order) => (
          <Link
            key={order.id}
            to={paths.for("/dashboard/orders/:id", { id: order.id })}
            style={{
              display: "block",
              padding: "0.75rem 1rem",
              backgroundColor: "hsl(var(--muted))",
              borderRadius: "0.5rem",
              textDecoration: "none",
            }}
          >
            <strong>{order.name}</strong>
            <span
              style={{
                marginLeft: "0.5rem",
                color: "hsl(var(--muted-foreground))",
              }}
            >
              ({order.status})
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};

OrdersPage.appShellPageProps = {
  meta: {
    title: "Orders",
  },
} satisfies AppShellPageProps;

export default OrdersPage;
