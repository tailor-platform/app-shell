import {
  AppShell,
  AppShellProps,
  CommandPalette,
  DefaultSidebar,
  SidebarLayout,
} from "@tailor-platform/app-shell";
import {
  profileResource,
  customPageModule,
  SidebarMenu,
  RoleSwitcherProvider,
  useRoleSwitcher,
} from "app-module";

const App = () => {
  const { role } = useRoleSwitcher();
  const appShellConfig: AppShellProps = {
    title: "AppShell",
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

const AppWithProviders = () => {
  return (
    <RoleSwitcherProvider defaultRole="staff">
      <App />
    </RoleSwitcherProvider>
  );
};

export default AppWithProviders;
