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
  CheckSquareIcon,
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
    title: "Project Manager",
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
                title="Projects"
                icon={<FolderIcon width={16} height={16} />}
                to="/projects"
              >
                <SidebarItem
                  to="/projects"
                  title="All Projects"
                  activeMatch="exact"
                />
              </SidebarGroup>
              <WithGuard guards={[adminOnlyGuard]}>
                <SidebarItem
                  to="/tasks"
                  title="Tasks"
                  icon={<CheckSquareIcon width={16} height={16} />}
                />
              </WithGuard>
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
