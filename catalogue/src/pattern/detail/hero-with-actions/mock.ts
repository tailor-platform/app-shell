export type LineItem = {
  id: string;
  sku: string;
  qty: number;
  total: number;
};

export type ActivityItem = {
  id: string;
  actor: { name: string };
  description: string;
  timestamp: Date;
};

export type Order = {
  id: string;
  number: string;
  status: string;
  customer: string;
  total: string;
  lineItems: LineItem[];
  activities: ActivityItem[];
};

export const mockOrder: Order = {
  id: "1",
  number: "ORD-1234",
  status: "Confirmed",
  customer: "Acme Corp",
  total: "$4,500.00",
  lineItems: [
    { id: "li-1", sku: "SKU-001", qty: 10, total: 2500 },
    { id: "li-2", sku: "SKU-002", qty: 5, total: 1200 },
    { id: "li-3", sku: "SKU-003", qty: 3, total: 800 },
  ],
  activities: [
    {
      id: "a-1",
      actor: { name: "Hanna" },
      description: "confirmed the order",
      timestamp: new Date("2025-01-20T10:30:00"),
    },
    {
      id: "a-2",
      actor: { name: "System" },
      description: "Status changed to CONFIRMED",
      timestamp: new Date("2025-01-20T10:30:00"),
    },
    {
      id: "a-3",
      actor: { name: "Alex" },
      description: "created the order",
      timestamp: new Date("2025-01-19T14:00:00"),
    },
  ],
};
