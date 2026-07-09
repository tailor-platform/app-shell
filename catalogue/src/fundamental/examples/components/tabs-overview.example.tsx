import { Tabs } from "@tailor-platform/app-shell";

export function TabsOverviewExample() {
  return (
    <Tabs.Root defaultValue="overview" variant="line">
      <Tabs.List>
        <Tabs.Tab value="overview">Overview</Tabs.Tab>
        <Tabs.Tab value="items">Line items</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="overview">Overview content</Tabs.Panel>
      <Tabs.Panel value="items">Line items content</Tabs.Panel>
    </Tabs.Root>
  );
}
