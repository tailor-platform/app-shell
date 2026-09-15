import type { Order } from "./columns";

export const mockOrders: Order[] = [
  {
    id: "1",
    orderNumber: "ORD-001",
    customer: "Acme Corp",
    status: "confirmed",
    amount: 1500,
    createdAt: "2025-01-15",
  },
  {
    id: "2",
    orderNumber: "ORD-002",
    customer: "Globex Inc",
    status: "draft",
    amount: 3200,
    createdAt: "2025-01-16",
  },
  {
    id: "3",
    orderNumber: "ORD-003",
    customer: "Initech",
    status: "shipped",
    amount: 890,
    createdAt: "2025-01-17",
  },
  {
    id: "4",
    orderNumber: "ORD-004",
    customer: "Umbrella Corp",
    status: "delivered",
    amount: 4200,
    createdAt: "2025-01-18",
  },
  {
    id: "5",
    orderNumber: "ORD-005",
    customer: "Stark Industries",
    status: "confirmed",
    amount: 7800,
    createdAt: "2025-01-19",
  },
];
