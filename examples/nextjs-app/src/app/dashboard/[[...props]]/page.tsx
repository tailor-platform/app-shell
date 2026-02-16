"use client";
import {
  AppShell,
  AppShellProps,
  CommandPalette,
  DefaultSidebar,
  SidebarLayout,
} from "@tailor-platform/app-shell";
import {
  customPageModule,
  profileResource,
  RoleSwitcherProvider,
  SidebarMenu,
  useRoleSwitcher,
} from "app-module";

const App = () => {
  const { role } = useRoleSwitcher();
  const appShellConfig: AppShellProps = {
    title: "AppShell",
    basePath: "dashboard",
    modules: [customPageModule],
    settingsResources: [profileResource],
    contextData: {
      role,
    },
  };

  return (
    <AppShell {...appShellConfig}>
      <>
        <SidebarLayout sidebar={<DefaultSidebar footer={<SidebarMenu />} />} />
        <CommandPalette />
      </>
    </AppShell>
  );
};

const Page = () => {
  return (
    <RoleSwitcherProvider defaultRole="staff">
      <App />
    </RoleSwitcherProvider>
  );
};

export default Page;
