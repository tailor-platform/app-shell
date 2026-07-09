import { Card, Table } from "@tailor-platform/app-shell";

export function CardHeaderTableExample() {
  return (
    <Card.Root>
      <Card.Header title="Line items" />
      <Card.Content className="astw:px-0">
        <Table.Root containerClassName="astw:px-6">
          <Table.Body>
            <Table.Row>
              <Table.Cell>Widget A</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Root>
      </Card.Content>
    </Card.Root>
  );
}
