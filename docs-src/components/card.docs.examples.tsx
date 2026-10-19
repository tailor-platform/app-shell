import { Card, Table } from "@tailor-platform/app-shell";

export function BasicUsage() {
  return (
    <Card.Root>
      <Card.Header title="Order Details" description="Summary of order #1234" />
      <Card.Content>
        <p>Content goes here</p>
      </Card.Content>
    </Card.Root>
  );
}

export function EdgeToEdgeTable() {
  return (
    <Card.Root>
      <Card.Header title="Line items" />
      <Card.Content padding="none">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Item</Table.Head>
              <Table.Head align="right">Qty</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            <Table.Row>
              <Table.Cell>Steel bracket</Table.Cell>
              <Table.Cell align="right">12</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell>Hex bolt M8</Table.Cell>
              <Table.Cell align="right">40</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Root>
      </Card.Content>
    </Card.Root>
  );
}
