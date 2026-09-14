import {
  AppShell,
  Link,
  SidebarLayout,
  defineModule,
  defineResource,
  redirectTo,
  useParams,
} from "@tailor-platform/app-shell";

const OrdersPage = () => {
  return (
    <main data-testid="nextjs-page-orders" style={{ padding: "1.5rem" }}>
      <h1>Orders</h1>
      <p>Minimal Next.js App Router smoke for defineModule / defineResource.</p>
      <Link data-testid="nextjs-order-link" to="/sales/orders/123">
        Open order 123
      </Link>
    </main>
  );
};

const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <main data-testid="nextjs-page-order-detail" style={{ padding: "1.5rem" }}>
      <h1>Order {id}</h1>
      <p>Dynamic sub-resource rendered inside Next.js catch-all route.</p>
      <Link data-testid="nextjs-back-link" to="/sales/orders">
        Back to orders
      </Link>
    </main>
  );
};

const modules = [
  defineModule({
    path: "sales",
    meta: { title: "Sales" },
    resources: [
      defineResource({
        path: "orders",
        meta: { title: "Orders" },
        component: OrdersPage,
        subResources: [
          defineResource({
            path: ":id",
            meta: { title: "Order detail" },
            component: OrderDetailPage,
          }),
        ],
      }),
    ],
  }),
  defineModule({
    path: "legacy",
    meta: { title: "Legacy" },
    guards: [() => redirectTo("/sales/orders")],
    resources: [],
  }),
];

export const NextjsSmokeApp = () => {
  return (
    <AppShell title="Next.js smoke" basePath="dashboard" modules={modules}>
      <SidebarLayout sidebar={<SidebarLayout.DefaultSidebar />} />
    </AppShell>
  );
};
