import { Button, Field, Input, Sheet } from "@tailor-platform/app-shell";

export function SheetFiltersExample() {
  return (
    <Sheet.Root side="right">
      <Sheet.Trigger render={<Button variant="outline" />}>Filters</Sheet.Trigger>
      <Sheet.Content className="astw:w-full sm:astw:max-w-[32rem]">
        <Sheet.Header>
          <Sheet.Title>Filter orders</Sheet.Title>
        </Sheet.Header>
        <div className="flex flex-col gap-4 p-4">
          <Field.Root name="supplier">
            <Field.Label>Supplier</Field.Label>
            <Field.Control render={<Input />} />
          </Field.Root>
        </div>
        <Sheet.Footer>
          <Sheet.Close render={<Button variant="outline" />}>Clear</Sheet.Close>
          <Button>Apply</Button>
        </Sheet.Footer>
      </Sheet.Content>
    </Sheet.Root>
  );
}
