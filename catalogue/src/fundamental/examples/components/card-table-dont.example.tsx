import { Card, Table } from "@tailor-platform/app-shell";

export function CardTableDontExample() {
  return (
    <Card.Root>
      <Card.Content className="astw:px-0">
        <Table.Root>{/* missing containerClassName="astw:px-6" */}</Table.Root>
      </Card.Content>
    </Card.Root>
  );
}
