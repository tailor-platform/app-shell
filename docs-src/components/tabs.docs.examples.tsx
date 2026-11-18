import { Tabs } from "@tailor-platform/app-shell";
import { FolderKanbanIcon, LayoutDashboardIcon, SettingsIcon } from "lucide-react";

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

export function DisabledTab() {
  return (
    <Tabs.Root defaultValue="active">
      <Tabs.List>
        <Tabs.Tab value="active">Active</Tabs.Tab>
        <Tabs.Tab value="pending">Pending</Tabs.Tab>
        <Tabs.Tab value="archived" disabled>
          Archived
        </Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="active">Active items</Tabs.Panel>
      <Tabs.Panel value="pending">Pending items</Tabs.Panel>
      <Tabs.Panel value="archived">Archived items</Tabs.Panel>
    </Tabs.Root>
  );
}

export function IconTabs() {
  return (
    <Tabs.Root defaultValue="overview" variant="capsule" size="default">
      <Tabs.List>
        <Tabs.Tab value="overview" aria-label="Overview">
          <LayoutDashboardIcon />
        </Tabs.Tab>
        <Tabs.Tab value="projects" aria-label="Projects">
          <FolderKanbanIcon />
        </Tabs.Tab>
        <Tabs.Tab value="settings" aria-label="Settings">
          <SettingsIcon />
        </Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="overview">Overview content</Tabs.Panel>
      <Tabs.Panel value="projects">Projects content</Tabs.Panel>
      <Tabs.Panel value="settings">Settings content</Tabs.Panel>
    </Tabs.Root>
  );
}
