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

export {
  useAppShell,
  useAppShellConfig,
  useAppShellData,
} from "./contexts/appshell-context";
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

// Toast
export { useToast } from "./hooks/use-toast";

// Badge component
export { Badge, badgeVariants, type BadgeProps } from "./components/badge";

// DescriptionCard
export {
  DescriptionCard,
  type DescriptionCardProps,
} from "./components/description-card";

// Layout component
export { Layout, type LayoutProps } from "./components/layout";

// File-based routing types
export type { AppShellPageProps, PageComponent } from "./fs-routes/types";

// Typed paths utility
export { createTypedPaths } from "./fs-routes/typed-paths";

// Page meta hook
export { usePageMeta, type PageMeta } from "./hooks/use-page-meta";

// === Primitive UI Components ===

export { Accordion } from "./components/accordion";
export { AlertDialog } from "./components/alert-dialog";
export { Autocomplete } from "./components/autocomplete";
export { Avatar } from "./components/avatar";
export { Breadcrumb } from "./components/breadcrumb";
export { Button, buttonVariants } from "./components/button";
export { Checkbox, CheckboxGroup } from "./components/checkbox";
export { Collapsible } from "./components/collapsible";
export { Combobox } from "./components/combobox";
export { Dialog } from "./components/dialog";
export { Field } from "./components/field";
export { Fieldset } from "./components/fieldset";
export { Form } from "./components/form";
export { Input } from "./components/input";
export { Label } from "./components/label";
export { Meter } from "./components/meter";
export { NumberField } from "./components/number-field";
export { Popover } from "./components/popover";
export { PreviewCard } from "./components/preview-card";
export { Progress } from "./components/progress";
export { Radio, RadioGroup } from "./components/radio";
export { ScrollArea } from "./components/scroll-area";
export { Select } from "./components/select";
export { Separator } from "./components/separator";
export { Sheet } from "./components/sheet";
export { Slider } from "./components/slider";
export { Switch } from "./components/switch";
export { Table } from "./components/table";
export { Tabs } from "./components/tabs";
export { Toggle, toggleVariants } from "./components/toggle";
export { ToggleGroup } from "./components/toggle-group";
export { Toolbar } from "./components/toolbar";
export { Tooltip } from "./components/tooltip";
