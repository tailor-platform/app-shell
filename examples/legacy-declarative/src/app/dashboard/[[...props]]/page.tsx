"use client";
import {
  AppShell,
  AppShellProps,
  CommandPalette,
  DefaultSidebar,
  SidebarLayout,
  defineModule,
  defineResource,
  hidden,
  pass,
  redirectTo,
  type Guard,
} from "@tailor-platform/app-shell";
import {
  RoleSwitcherProvider,
  SidebarMenu,
  useRoleSwitcher,
  ProjectListPage,
  ProjectDetailPage,
  FolderIcon,
  TaskListPage,
  CheckSquareIcon,
  DescriptionCardDemoPage,
  OneColumnLayoutPage,
  TwoColumnLayoutPage,
  ThreeColumnLayoutPage,
  LayoutIcon,
  ProfileSettingsPage,
  UserIcon,
} from "shared-pages";

// ============================================================================
// Guards
// ============================================================================

const adminOnlyGuard: Guard = ({ context }) => {
  if (context.role !== "admin") {
    return hidden();
  }
  return pass();
};

// ============================================================================
// Module & Resource Definitions (Declarative API)
// ============================================================================

const projectDetailResource = defineResource({
  path: ":id",
  meta: { title: "Project Detail" },
  component: () => <ProjectDetailPage backTo="/dashboard/projects" />,
});

const projectsModule = defineModule({
  path: "projects",
  meta: {
    title: "Projects",
    icon: <FolderIcon width={16} height={16} />,
  },
  component: () => (
    <ProjectListPage linkTo={(id) => `/dashboard/projects/${id}`} />
  ),
  resources: [projectDetailResource],
});

const tasksModule = defineModule({
  path: "tasks",
  meta: {
    title: "Tasks",
    icon: <CheckSquareIcon width={16} height={16} />,
  },
  guards: [adminOnlyGuard],
  component: () => <TaskListPage />,
  resources: [],
});

const descriptionCardResource = defineResource({
  path: "description-card",
  meta: { title: "Description Card" },
  component: () => <DescriptionCardDemoPage />,
});

const layout1Resource = defineResource({
  path: "layout-1-column",
  meta: { title: "1 Column" },
  component: () => <OneColumnLayoutPage />,
});

const layout2Resource = defineResource({
  path: "layout-2-columns",
  meta: { title: "2 Columns" },
  component: () => <TwoColumnLayoutPage />,
});

const layout3Resource = defineResource({
  path: "layout-3-columns",
  meta: { title: "3 Columns" },
  component: () => <ThreeColumnLayoutPage />,
});

const componentsModule = defineModule({
  path: "components",
  meta: {
    title: "Components",
    icon: <LayoutIcon width={16} height={16} />,
  },
  guards: [() => redirectTo("description-card")],
  resources: [
    descriptionCardResource,
    layout1Resource,
    layout2Resource,
    layout3Resource,
  ],
});

const profileResource = defineResource({
  path: "profile",
  meta: {
    title: "Profile",
    icon: <UserIcon width={16} height={16} />,
  },
  component: () => <ProfileSettingsPage />,
});

// ============================================================================
// App
// ============================================================================

const App = () => {
  const { role } = useRoleSwitcher();
  const appShellConfig: AppShellProps = {
    title: "Project Manager",
    basePath: "dashboard",
    modules: [projectsModule, tasksModule, componentsModule],
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
