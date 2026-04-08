import type { CommandPaletteSearchResult } from "@tailor-platform/app-shell";
import { paths } from "./routes.generated";

const customerNames = [
  "Acme Corp",
  "Globex Inc",
  "Initech LLC",
  "Umbrella Corp",
  "Stark Industries",
  "Wayne Enterprises",
  "Oscorp",
  "LexCorp",
  "Cyberdyne Systems",
  "Tyrell Corp",
  "Soylent Corp",
  "Massive Dynamic",
  "Wonka Industries",
  "Aperture Science",
  "Black Mesa",
  "Weyland-Yutani",
  "Buy n Large",
  "Virtucon",
  "Gekko & Co",
  "Dunder Mifflin",
];

const fakeOrders = Array.from({ length: 100 }, (_, i) => ({
  id: `order-${String(i + 1).padStart(3, "0")}`,
  number: `ORD-${1001 + i}`,
  customer: customerNames[i % customerNames.length],
  date: `2024-${String(Math.floor(i / 9) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
}));

export async function searchOrders(
  query: string,
  { signal }: { signal: AbortSignal },
): Promise<CommandPaletteSearchResult[]> {
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
}
