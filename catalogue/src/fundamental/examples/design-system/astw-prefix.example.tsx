import { Sheet, Table } from "@tailor-platform/app-shell";

export function AstwPrefixExample() {
  return (
    <>
      <Table.Root containerClassName="astw:px-6 astw:max-h-96 astw:overflow-y-auto">
        <Table.Body>
          <Table.Row>
            <Table.Cell>PO-1001</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table.Root>

      <Sheet.Root side="right" defaultOpen>
        <Sheet.Content className="astw:w-[480px] astw:flex astw:flex-col astw:gap-4">
          <Sheet.Header>
            <Sheet.Title>Filters</Sheet.Title>
          </Sheet.Header>
          <div className="p-4">Sheet content</div>
        </Sheet.Content>
      </Sheet.Root>
    </>
  );
}
