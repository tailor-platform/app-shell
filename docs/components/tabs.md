# Tabs

Tabbed navigation.

## Parts

| Part           | Description           |
| -------------- | --------------------- |
| `Tabs.Root`    | Root provider         |
| `Tabs.List`    | Tab button container  |
| `Tabs.Trigger` | Individual tab button |
| `Tabs.Content` | Tab panel content     |

## Example

```tsx
import { Tabs } from "@tailor-platform/app-shell";

<Tabs.Root defaultValue="tab1">
  <Tabs.List>
    <Tabs.Trigger value="tab1">General</Tabs.Trigger>
    <Tabs.Trigger value="tab2">Security</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="tab1">General settings...</Tabs.Content>
  <Tabs.Content value="tab2">Security settings...</Tabs.Content>
</Tabs.Root>;
```
