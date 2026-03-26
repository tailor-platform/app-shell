import "./globals.css";
export { AppShell, type AppShellProps } from "./components/appshell";
export { SidebarLayout, DefaultSidebar } from "./components/sidebar/index";
export { CommandPalette } from "./components/command-palette";

// Sidebar navigation components
export {
  SidebarItem,
  SidebarGroup,
  SidebarSeparator,
  type SidebarItemProps,
  type SidebarGroupProps,
  type SidebarLayoutProps,
  type DefaultSidebarProps,
} from "./components/sidebar/index";

// Guard component for conditional rendering
export { WithGuard, type WithGuardProps } from "./components/with-guard";

export { useAppShell, useAppShellConfig, useAppShellData } from "./contexts/appshell-context";
export { useTheme } from "./contexts/theme-context";
export { type I18nLabels, defineI18nLabels } from "./hooks/i18n";
export {
  AuthProvider,
  useAuth,
  useAuthSuspense,
  createAuthClient,
  type AuthState,
  type EnhancedAuthClient,
  type AuthClientConfig,
} from "./contexts/auth-context";

// Re-export auth-public-client types for advanced use cases
export type { AuthClient } from "@tailor-platform/auth-public-client";

export {
  type AppShellRegister,
  type ContextData,
  type RouteParams,
} from "./contexts/appshell-context";
export {
  defineModule,
  defineResource,
  // Guard helpers
  pass,
  hidden,
  redirectTo,
  // Guard types
  type Guard,
  type GuardContext,
  type GuardResult,
  type ResourceComponentProps,
  type ErrorBoundaryComponent,
} from "./resource";

// Re-exports react-router hooks
export {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
  useRouteError,
  Link,
} from "react-router";

// File-based routing types
export type { AppShellPageProps, PageComponent } from "./fs-routes/types";
export { createTypedPaths } from "./fs-routes/typed-paths";

// Page meta hook
export { usePageMeta, type PageMeta } from "./hooks/use-page-meta";

// Toast
export { useToast } from "./hooks/use-toast";

// Components
export { Badge, badgeVariants, type BadgeProps } from "./components/badge";
export { DescriptionCard, type DescriptionCardProps } from "./components/description-card";
export {
  ActivityCard,
  type ActivityCardProps,
  type ActivityCardItem,
  type ActivityCardBaseItem,
  type ActivityCardRootProps,
  type ActivityCardItemsProps,
  type ActivityCardItemProps,
} from "./components/activity-card";
export { ActionPanel, type ActionPanelProps } from "./components/action-panel";
export { MetricCard, type MetricCardProps } from "./components/metric-card";
export { Layout, type LayoutProps } from "./components/layout/Layout";
export { Button, buttonVariants, type ButtonProps } from "./components/button";
export { Avatar, avatarVariants, type AvatarProps } from "./components/avatar";
export { Input, type InputProps } from "./components/input";
export { Table } from "./components/table";
export { Card } from "./components/card";
export { Dialog } from "./components/dialog";
export { Field } from "./components/field";
export { Fieldset } from "./components/fieldset";
export { Form, type FormProps } from "./components/form";
export { Menu } from "./components/menu";
export { Sheet } from "./components/sheet";
export { Tabs } from "./components/tabs";
export { Tooltip } from "./components/tooltip";
export { Select, type SelectAsyncFetcher } from "./components/select-standalone";
export { Combobox, type ComboboxAsyncFetcher } from "./components/combobox-standalone";
export { Autocomplete, type AutocompleteAsyncFetcher } from "./components/autocomplete-standalone";
export { type MappedItem, type ItemGroup } from "./components/dropdown-items";
