import { Button, Card, Table, Text } from "@tailor-platform/app-shell";

export function BasicUsage() {
  return (
    <Card.Root>
      <Card.Header title="Order Details" description="Summary of order #1234" />
      <Card.Content>
        <Text.p>Content goes here</Text.p>
      </Card.Content>
    </Card.Root>
  );
}

export function HeaderAndFooterActions() {
  return (
    <Card.Root>
      <Card.Header
        title="Order details"
        description="Review the order before saving."
        action={
          <Button type="button" variant="outline" size="sm">
            Edit
          </Button>
        }
      />
      <Card.Content>
        <Text.p>Order content goes here.</Text.p>
      </Card.Content>
      <Card.Footer>
        <Button type="button" variant="outline">
          Cancel
        </Button>
        <Button type="button">Save</Button>
      </Card.Footer>
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

export function HeaderOnly() {
  return (
    <Card.Root>
      <Card.Header title="Summary" description="Key metrics for this period" />
    </Card.Root>
  );
}

export function ContentOnly() {
  return (
    <Card.Root>
      <Card.Content>
        <Text.p>No header needed for this card.</Text.p>
      </Card.Content>
    </Card.Root>
  );
}

export function CustomHeaderContent() {
  return (
    <Card.Root>
      <Card.Header title="Recent Orders">
        <Button size="sm" variant="outline">
          View all
        </Button>
      </Card.Header>
      <Card.Content padding="none">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Order</Table.Head>
              <Table.Head>Status</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            <Table.Row>
              <Table.Cell>ORD-12345</Table.Cell>
              <Table.Cell>Confirmed</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Root>
      </Card.Content>
    </Card.Root>
  );
}
