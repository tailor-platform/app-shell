import {
  AppShell,
  CommandPalette,
  DefaultSidebar,
  SidebarLayout,
  type CommandPaletteSearchResult,
  type CommandPaletteSearchSource,
} from "@tailor-platform/app-shell";
import { paths } from "./routes.generated";

// Fake order data simulating a backend
const fakeOrders = [
  {
    id: "order-001",
    number: "ORD-1001",
    customer: "Acme Corp",
    date: "2024-01-15",
  },
  {
    id: "order-002",
    number: "ORD-1002",
    customer: "Globex Inc",
    date: "2024-02-20",
  },
  {
    id: "order-003",
    number: "ORD-1003",
    customer: "Initech LLC",
    date: "2024-03-10",
  },
  {
    id: "order-004",
    number: "ORD-2001",
    customer: "Umbrella Corp",
    date: "2024-04-05",
  },
  {
    id: "order-005",
    number: "ORD-2002",
    customer: "Stark Industries",
    date: "2024-05-12",
  },
];

const searchSources: CommandPaletteSearchSource[] = [
  {
    prefix: "ORD",
    title: "Orders",
    search: async (query, { signal }): Promise<CommandPaletteSearchResult[]> => {
      // Simulate network latency
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, 200);
        signal.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new DOMException("Aborted", "AbortError"));
        });
      });

      const lowerQuery = query.toLowerCase();
      return fakeOrders
        .filter(
          (o) =>
            !lowerQuery ||
            o.number.toLowerCase().includes(lowerQuery) ||
            o.customer.toLowerCase().includes(lowerQuery),
        )
        .map((order) => ({
          key: order.id,
          label: order.number,
          description: `${order.customer} — ${order.date}`,
          path: paths.for("/dashboard/orders/:id", { id: order.id }),
        }));
    },
  },
];

const App = () => {
  return (
    <AppShell title="File-Based Routing Demo">
      <>
        <SidebarLayout sidebar={<DefaultSidebar />} />
        <CommandPalette searchSources={searchSources} />
      </>
    </AppShell>
  );
};

export default App;
