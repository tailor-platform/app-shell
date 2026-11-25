import { Button, Input, Toolbar } from "@tailor-platform/app-shell";

export function BasicUsage() {
  return (
    <Toolbar.Root>
      <Toolbar.Row justify="between" aria-label="Order actions">
        <Toolbar.Group>
          <Button variant="outline">Export</Button>
        </Toolbar.Group>
        <Toolbar.Group>
          <Button>New order</Button>
        </Toolbar.Group>
      </Toolbar.Row>
    </Toolbar.Root>
  );
}

export function Structure() {
  return (
    <Toolbar.Root>
      <Toolbar.Row justify="between" aria-label="Text formatting">
        <Toolbar.Group>
          <Button variant="outline">Bold</Button>
          <Button variant="outline">Italic</Button>
          <Toolbar.Separator />
          <Button variant="outline">Copy</Button>
        </Toolbar.Group>
        <Toolbar.Group>
          <Button>Save</Button>
        </Toolbar.Group>
      </Toolbar.Row>
      <Toolbar.Row aria-label="Active filters">
        <Toolbar.Group>
          <Button variant="secondary">Status: Open</Button>
        </Toolbar.Group>
      </Toolbar.Row>
    </Toolbar.Root>
  );
}

export function RowAlignment() {
  return (
    <Toolbar.Root>
      <Toolbar.Row justify="between" aria-label="List actions">
        <Toolbar.Group>
          <div className="w-44">
            <Input aria-label="Search orders" placeholder="Search orders" />
          </div>
          <Button variant="outline">Filters</Button>
        </Toolbar.Group>
        <Toolbar.Group>
          <Button variant="outline">Export</Button>
          <Button>New order</Button>
        </Toolbar.Group>
      </Toolbar.Row>
    </Toolbar.Root>
  );
}
