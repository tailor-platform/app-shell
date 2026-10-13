import { Tabs } from "@tailor-platform/app-shell";

export function BasicUsage() {
  return (
    <Tabs.Root defaultValue="overview">
      <Tabs.List>
        <Tabs.Tab value="overview">Overview</Tabs.Tab>
        <Tabs.Tab value="projects">Projects</Tabs.Tab>
        <Tabs.Tab value="account">Account</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="overview">Overview content</Tabs.Panel>
      <Tabs.Panel value="projects">Projects content</Tabs.Panel>
      <Tabs.Panel value="account">Account content</Tabs.Panel>
    </Tabs.Root>
  );
}
