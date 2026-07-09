import { Badge, Table } from "@tailor-platform/app-shell";

type OrderStatus = "Confirmed" | "Draft" | "Overdue";

type OrderRow = {
  id: string;
  number: string;
  status: OrderStatus;
  total: number;
};

const orders: OrderRow[] = [
  { id: "1", number: "PO-1001", status: "Confirmed", total: 1500 },
  { id: "2", number: "PO-1002", status: "Draft", total: 750 },
  { id: "3", number: "PO-1003", status: "Overdue", total: 420 },
];

const statusVariants: Record<OrderStatus, "success" | "neutral" | "error"> = {
  Confirmed: "success",
  Draft: "neutral",
  Overdue: "error",
};

const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

export function TableOrdersExample() {
  return (
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>Order</Table.Head>
          <Table.Head>Status</Table.Head>
          <Table.Head align="right">Total</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {orders.map((order) => (
          <Table.Row key={order.id}>
            <Table.Cell>{order.number}</Table.Cell>
            <Table.Cell>
              <Badge variant={statusVariants[order.status]}>{order.status}</Badge>
            </Table.Cell>
            <Table.Cell align="right">{formatMoney(order.total)}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
