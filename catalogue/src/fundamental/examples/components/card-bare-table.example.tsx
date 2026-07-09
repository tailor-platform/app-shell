import { Card, Table } from "@tailor-platform/app-shell";

export function CardBareTableExample() {
  return (
    <Card.Root>
      <Table.Root containerClassName="astw:px-6">
        <Table.Body>
          <Table.Row>
            <Table.Cell>PO-1001</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table.Root>
    </Card.Root>
  );
}
