---
"@tailor-platform/app-shell": minor
---

Export primitive UI components (`Button`, `Input`, `Table`, `Dialog`, `Sheet`, `Tooltip`) and update `@base-ui/react` to v1.3.0.

## New components

```tsx
import { Button, Input, Table, Dialog, Sheet, Tooltip } from "@tailor-platform/app-shell";
```

### Button

Styled button with variant (`default`, `outline`, `destructive`, etc.) and size options.

```tsx
<Button variant="outline" size="sm">
  Click me
</Button>
```

### Input

Styled text input with consistent theming.

```tsx
<Input placeholder="Enter your name" />
```

### Dialog

Modal dialog with compound component API (`Dialog.Root`, `Dialog.Content`, etc.).

```tsx
<Dialog.Root>
  <Dialog.Trigger render={<Button />}>Open</Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Title>Confirm</Dialog.Title>
    <Dialog.Description>Are you sure?</Dialog.Description>
    <Dialog.Footer>
      <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
      <Button>Confirm</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
```

### Sheet

Slide-in panel backed by Drawer with native swipe-to-dismiss gesture support.

```tsx
<Sheet.Root side="right">
  <Sheet.Trigger render={<Button />}>Open</Sheet.Trigger>
  <Sheet.Content>
    <Sheet.Title>Settings</Sheet.Title>
  </Sheet.Content>
</Sheet.Root>
```

### Tooltip

Hover/focus tooltip with configurable placement and delay via `Tooltip.Provider`.

```tsx
<Tooltip.Root>
  <Tooltip.Trigger render={<Button />}>Hover me</Tooltip.Trigger>
  <Tooltip.Content>Help text</Tooltip.Content>
</Tooltip.Root>
```

### Table

Semantic HTML table with pre-styled header, body, and footer sub-components.

```tsx
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
```

## Other changes

- `DescriptionCard`, `Layout`, and `Layout.Column` now accept an optional `style` prop for inline styles.
- Fixed Dialog and Sheet overlay flashing on close animation.
- Fixed missing `astw:` prefixes on sidebar utility classes that caused mobile sidebar UI bugs.
