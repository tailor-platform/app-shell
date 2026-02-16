import "./globals.css";
export { AppShell, type AppShellProps } from "./components/appshell";
export { SidebarLayout, DefaultSidebar } from "./components/sidenav-layout";
export { CommandPalette } from "./components/command-palette";
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
export { Badge, badgeVariants, type BadgeProps } from "./components/ui/badge";

// DescriptionCard
export {
  DescriptionCard,
  type DescriptionCardProps,
} from "./components/description-card";

// Layout component
export { Layout, type LayoutProps } from "./components/layout";
