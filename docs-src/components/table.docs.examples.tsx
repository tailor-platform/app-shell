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
