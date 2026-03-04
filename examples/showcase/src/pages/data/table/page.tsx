import { Table } from "@tailor-platform/app-shell";
import { Section, invoices } from "../../../shared";

const TablePage = () => {
  return (
    <div
      style={{
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      <Section title="Table + ScrollArea">
        <Table.Root
          containerStyle={{
            height: "24rem",
            borderRadius: "0.375rem",
            border: "1px solid var(--border)",
          }}
        >
          <Table.Header>
            <Table.Row>
              <Table.Head>Invoice</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head>Method</Table.Head>
              <Table.Head>Amount</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {invoices.map((inv) => (
              <Table.Row key={inv.id}>
                <Table.Cell className="astw:font-medium">{inv.id}</Table.Cell>
                <Table.Cell>{inv.status}</Table.Cell>
                <Table.Cell>{inv.method}</Table.Cell>
                <Table.Cell className="astw:text-right">
                  {inv.amount}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
          <Table.Footer>
            <Table.Row>
              <Table.Cell colSpan={3}>Total</Table.Cell>
              <Table.Cell className="astw:text-right">$1,750.00</Table.Cell>
            </Table.Row>
          </Table.Footer>
        </Table.Root>
      </Section>
    </div>
  );
};

export default TablePage;
