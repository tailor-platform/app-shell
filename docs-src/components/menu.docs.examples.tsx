import { useState } from "react";
import { Button, Menu, Text } from "@tailor-platform/app-shell";
import { EllipsisVerticalIcon } from "lucide-react";

export function CheckboxItems() {
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);

  return (
    <div className="space-y-3">
      <Menu.Root>
        <Menu.Trigger render={<Button variant="outline" />}>Format text</Menu.Trigger>
        <Menu.Content>
          <Menu.CheckboxItem checked={bold} onCheckedChange={setBold}>
            <Menu.CheckboxItemIndicator>✓</Menu.CheckboxItemIndicator>
            Bold
          </Menu.CheckboxItem>
          <Menu.CheckboxItem checked={italic} onCheckedChange={setItalic}>
            <Menu.CheckboxItemIndicator>✓</Menu.CheckboxItemIndicator>
            Italic
          </Menu.CheckboxItem>
        </Menu.Content>
      </Menu.Root>
      <Text.p
        style={{ fontWeight: bold ? "bold" : "normal", fontStyle: italic ? "italic" : "normal" }}
      >
        Format this sample text.
      </Text.p>
      <Text.p role="status">
        Bold: {bold ? "on" : "off"}; italic: {italic ? "on" : "off"}
      </Text.p>
    </div>
  );
}

export function RadioItems() {
  const [align, setAlign] = useState("left");

  return (
    <div className="space-y-3">
      <Menu.Root>
        <Menu.Trigger render={<Button variant="outline" />}>Align text</Menu.Trigger>
        <Menu.Content>
          <Menu.RadioGroup value={align} onValueChange={setAlign}>
            {["left", "center", "right"].map((value) => (
              <Menu.RadioItem key={value} value={value}>
                <Menu.RadioItemIndicator>●</Menu.RadioItemIndicator>
                {value}
              </Menu.RadioItem>
            ))}
          </Menu.RadioGroup>
        </Menu.Content>
      </Menu.Root>
      <Text.p
        className={
          align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"
        }
      >
        Align this sample text.
      </Text.p>
      <Text.p role="status">Alignment: {align}</Text.p>
    </div>
  );
}

export function RowActions() {
  const orderNumber = "ORD-1001";
  const [lastAction, setLastAction] = useState("None");

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Text.span>{orderNumber}</Text.span>
        <Menu.Root>
          <Menu.Trigger render={<Button variant="ghost" size="icon" aria-label="Order actions" />}>
            <EllipsisVerticalIcon />
          </Menu.Trigger>
          <Menu.Content>
            <Menu.Item onClick={() => setLastAction(`Edit ${orderNumber}`)}>Edit</Menu.Item>
            <Menu.Item onClick={() => setLastAction(`Duplicate ${orderNumber}`)}>
              Duplicate
            </Menu.Item>
            <Menu.Separator />
            <Menu.Item onClick={() => setLastAction(`View history for ${orderNumber}`)}>
              View history
            </Menu.Item>
          </Menu.Content>
        </Menu.Root>
      </div>
      <Text.p role="status">Last action: {lastAction}</Text.p>
    </div>
  );
}

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
