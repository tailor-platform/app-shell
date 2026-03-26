---
"@tailor-platform/app-shell": minor
---

Add `Tabs` compound component for tab-based navigation, backed by Base UI's Tabs primitive.

```tsx
import { Tabs } from "@tailor-platform/app-shell";

<Tabs.Root defaultValue="overview">
  <Tabs.List>
    <Tabs.Tab value="overview">Overview</Tabs.Tab>
    <Tabs.Tab value="projects">Projects</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="overview">Overview content</Tabs.Panel>
  <Tabs.Panel value="projects">Projects content</Tabs.Panel>
</Tabs.Root>;
```
