import {
  AppShell,
  AppShellProps,
  CommandPalette,
  DefaultSidebar,
  Guard,
  hidden,
  pass,
  SidebarGroup,
  SidebarItem,
  SidebarLayout,
  WithGuard,
} from "@tailor-platform/app-shell";
import {
  RoleSwitcherProvider,
  SidebarMenu,
  useRoleSwitcher,
  FolderIcon,
  LayoutIcon,
} from "shared-pages";

const adminOnlyGuard: Guard = ({ context }) => {
  if (context.role !== "admin") {
    return hidden();
  }
  return pass();
};

const App = () => {
  const { role } = useRoleSwitcher();
  const appShellConfig: AppShellProps = {
    title: "AppShell Demo",
    contextData: {
      role,
    },
  };

  return (
    <AppShell {...appShellConfig}>
      <>
        <SidebarLayout
          sidebar={
            <DefaultSidebar footer={<SidebarMenu />}>
              <SidebarGroup
                title="Demo"
                icon={<FolderIcon width={16} height={16} />}
              >
                <SidebarItem
                  to="/projects"
                  title="Projects"
                />
                <WithGuard guards={[adminOnlyGuard]}>
                  <SidebarItem
                    to="/tasks"
                    title="Tasks"
                  />
                </WithGuard>
              </SidebarGroup>
              <SidebarGroup
                title="Components"
                icon={<LayoutIcon width={16} height={16} />}
              >
                <SidebarItem to="/components/description-card" />
                <SidebarItem to="/components/layout-1-column" />
                <SidebarItem to="/components/layout-2-columns" />
                <SidebarItem to="/components/layout-3-columns" />
              </SidebarGroup>
            </DefaultSidebar>
          }
        />
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
