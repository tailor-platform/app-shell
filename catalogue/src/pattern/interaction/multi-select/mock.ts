export type Order = {
  id: string;
  number: string;
  status: string;
  total: number;
};

export const mockOrders: Order[] = [
  { id: "1", number: "ORD-001", status: "Open", total: 1240 },
  { id: "2", number: "ORD-002", status: "Confirmed", total: 3800 },
  { id: "3", number: "ORD-003", status: "Open", total: 920 },
  { id: "4", number: "ORD-004", status: "Shipped", total: 5600 },
  { id: "5", number: "ORD-005", status: "Open", total: 2100 },
];
