"use client";
import { AppShell, AppShellProps, DefaultSidebar, SidebarLayout } from "@tailor-platform/app-shell";
import {
  customPageModule,
  profileResource,
  RoleSwitcherProvider,
  SidebarMenu,
  useRoleSwitcher,
} from "@/modules";

const App = () => {
  const { role } = useRoleSwitcher();
  const appShellConfig: AppShellProps = {
    title: "AppShell",
    basePath: "dashboard",
    modules: [customPageModule],
    locale: "en",
    settingsResources: [profileResource],
    contextData: {
      role,
    },
  };

  return (
    <AppShell {...appShellConfig}>
      <SidebarLayout sidebar={<DefaultSidebar footer={<SidebarMenu />} />} />
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
