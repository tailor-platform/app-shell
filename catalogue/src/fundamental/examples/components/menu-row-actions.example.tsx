import { Button, Menu } from "@tailor-platform/app-shell";

export function MenuRowActionsExample() {
  const id = "PO-1234";
  const handleAssign = (value: string) => {
    void value;
  };
  const handleDuplicate = (value: string) => {
    void value;
  };
  const handleDelete = (value: string) => {
    void value;
  };

  return (
    <Menu.Root>
      <Menu.Trigger>
        <Button variant="ghost" size="sm">
          Actions
        </Button>
      </Menu.Trigger>
      <Menu.Content>
        <Menu.Item onSelect={() => handleAssign(id)}>Assign</Menu.Item>
        <Menu.Item onSelect={() => handleDuplicate(id)}>Duplicate</Menu.Item>
        <Menu.Separator />
        <Menu.Item onSelect={() => handleDelete(id)}>Delete</Menu.Item>
      </Menu.Content>
    </Menu.Root>
  );
}
