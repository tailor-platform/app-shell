// Page components
export {
  ProjectListPage,
  ProjectDetailPage,
  FolderIcon,
  mockProjects,
} from "./pages/projects";
export { TaskListPage, CheckSquareIcon, ShieldIcon } from "./pages/tasks";
export {
  DescriptionCardDemoPage,
  OneColumnLayoutPage,
  TwoColumnLayoutPage,
  ThreeColumnLayoutPage,
  LayoutIcon,
} from "./pages/components";
export { ProfileSettingsPage, UserIcon } from "./pages/settings";

// Shared context & sidebar
export { SidebarMenu } from "./sidebar-menu";
export {
  RoleSwitcherProvider,
  useRoleSwitcher,
  type Role,
  type RoleSwitcherContextType,
} from "./role-switcher";
