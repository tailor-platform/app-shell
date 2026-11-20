import { Table } from "@tailor-platform/app-shell";

export function BasicUsage() {
  return (
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>Name</Table.Head>
          <Table.Head>Email</Table.Head>
          <Table.Head>Role</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        <Table.Row>
          <Table.Cell>Alice</Table.Cell>
          <Table.Cell>alice@example.com</Table.Cell>
          <Table.Cell>Admin</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table.Root>
  );
}

export function WithFooter() {
  return (
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>Product</Table.Head>
          <Table.Head>Qty</Table.Head>
          <Table.Head>Price</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        <Table.Row>
          <Table.Cell>Widget A</Table.Cell>
          <Table.Cell>10</Table.Cell>
          <Table.Cell>$100.00</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>Widget B</Table.Cell>
          <Table.Cell>5</Table.Cell>
          <Table.Cell>$75.00</Table.Cell>
        </Table.Row>
      </Table.Body>
      <Table.Footer>
        <Table.Row>
          <Table.Cell colSpan={2}>Total</Table.Cell>
          <Table.Cell>$175.00</Table.Cell>
        </Table.Row>
      </Table.Footer>
    </Table.Root>
  );
}

export function WithCaption() {
  return (
    <Table.Root>
      <Table.Caption>Order line items</Table.Caption>
      <Table.Header>
        <Table.Row>
          <Table.Head>Item</Table.Head>
          <Table.Head>Status</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        <Table.Row>
          <Table.Cell>Item 1</Table.Cell>
          <Table.Cell>Shipped</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table.Root>
  );
}

export function NumericAlignment() {
  return (
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>Item</Table.Head>
          <Table.Head align="right">Amount</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        <Table.Row>
          <Table.Cell>Widget A</Table.Cell>
          <Table.Cell align="right">123</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table.Root>
  );
}

export function CenteredStatus() {
  return (
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>Item</Table.Head>
          <Table.Head align="center">Status</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        <Table.Row>
          <Table.Cell>Widget A</Table.Cell>
          <Table.Cell align="center">Active</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table.Root>
  );
}
