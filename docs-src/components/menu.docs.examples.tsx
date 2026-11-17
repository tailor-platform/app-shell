import { Menu } from "@tailor-platform/app-shell";

export function BasicUsage() {
  return (
    <Menu.Root>
      <Menu.Trigger>Open menu</Menu.Trigger>
      <Menu.Content>
        <Menu.Item>Edit</Menu.Item>
        <Menu.Item>Duplicate</Menu.Item>
        <Menu.Separator />
        <Menu.Item>Delete</Menu.Item>
      </Menu.Content>
    </Menu.Root>
  );
}

export function GroupedItems() {
  return (
    <Menu.Root>
      <Menu.Trigger>Actions</Menu.Trigger>
      <Menu.Content>
        <Menu.Group>
          <Menu.GroupLabel>File</Menu.GroupLabel>
          <Menu.Item>New</Menu.Item>
          <Menu.Item>Open</Menu.Item>
        </Menu.Group>
        <Menu.Separator />
        <Menu.Group>
          <Menu.GroupLabel>Edit</Menu.GroupLabel>
          <Menu.Item>Cut</Menu.Item>
          <Menu.Item>Copy</Menu.Item>
          <Menu.Item>Paste</Menu.Item>
        </Menu.Group>
      </Menu.Content>
    </Menu.Root>
  );
}

export function NestedSubmenus() {
  return (
    <Menu.Root>
      <Menu.Trigger>Edit</Menu.Trigger>
      <Menu.Content>
        <Menu.Item>Cut</Menu.Item>
        <Menu.Item>Copy</Menu.Item>
        <Menu.SubmenuRoot>
          <Menu.SubmenuTrigger>Paste Special ›</Menu.SubmenuTrigger>
          <Menu.Content>
            <Menu.Item>Paste as Plain Text</Menu.Item>
            <Menu.Item>Paste and Match Style</Menu.Item>
          </Menu.Content>
        </Menu.SubmenuRoot>
      </Menu.Content>
    </Menu.Root>
  );
}
