import {
  useParams,
  Link,
  type AppShellPageProps,
} from "@tailor-platform/app-shell";
import { paths } from "../../../../routes.generated";

const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div style={{ padding: "1.5rem" }}>
      <h1
        style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}
      >
        Order Detail: {id}
      </h1>
      <p
        style={{ marginBottom: "1rem", color: "hsl(var(--muted-foreground))" }}
      >
        This page is at <code>src/pages/dashboard/orders/[id]/page.tsx</code>
      </p>
      <div
        style={{
          padding: "1rem",
          backgroundColor: "hsl(var(--muted))",
          borderRadius: "0.5rem",
          marginBottom: "1rem",
        }}
      >
        <p>
          <strong>Order ID:</strong> {id}
        </p>
        <p>
          <strong>Status:</strong> Processing
        </p>
        <p>
          <strong>Created:</strong> {new Date().toLocaleDateString()}
        </p>
      </div>
      <Link
        to={paths.for("/dashboard/orders")}
        style={{ color: "hsl(var(--primary))", textDecoration: "underline" }}
      >
        ← Back to Orders
      </Link>
    </div>
  );
};

OrderDetailPage.appShellPageProps = {
  meta: {
    title: "Order Detail",
  },
} satisfies AppShellPageProps;

export default OrderDetailPage;
