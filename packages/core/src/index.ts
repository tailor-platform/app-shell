import "./globals.css";
export { AppShell, type AppShellProps } from "./components/appshell";
export { SidebarLayout, DefaultSidebar } from "./components/sidebar/index";
export { CommandPalette } from "./components/command-palette";
export {
  useRegisterCommandPaletteActions,
  type CommandPaletteAction,
  type CommandPaletteSearchResult,
  type SearchSource,
} from "./contexts/command-palette-context";

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

// Breadcrumb override
export { useOverrideBreadcrumb } from "./hooks/use-override-breadcrumb";

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
export { Tooltip } from "./components/tooltip";
export { Select, type SelectAsyncFetcher } from "./components/select-standalone";
export { Combobox, type ComboboxAsyncFetcher } from "./components/combobox-standalone";
export { Autocomplete, type AutocompleteAsyncFetcher } from "./components/autocomplete-standalone";
export { type MappedItem, type ItemGroup } from "./components/dropdown-items";
export {
  CsvImporter,
  useCsvImporter,
  csv,
  type CsvSchema,
  type CsvColumn,
  type CsvImportEvent,
  type CsvCorrection,
  type CsvColumnMapping,
  type CsvCellIssue,
  type ParsedRow,
  type InferCsvRow,
} from "./components/csv-importer";

// Collection (shared across DataTable, Kanban, Gantt, etc.)
export {
  OPERATORS_BY_FILTER_TYPE,
  fieldTypeToSortConfig,
  fieldTypeToFilterConfig,
  type SortConfig,
  type FilterConfig,
  type SortState,
  type Filter,
  type FilterOperator,
  type SelectOption,
  type PageInfo,
  type CollectionVariables,
  type CollectionControl,
  type CollectionResult,
  type NodeType,
  type PaginationVariables,
  type UseCollectionOptions,
  type UseCollectionReturn,
  type FieldType,
  type FieldMetadata,
  type TableMetadata,
  type TableMetadataMap,
  type BuildQueryVariables,
  type TableMetadataFilter,
  type TableFieldName,
  type TableOrderableFieldName,
} from "./types/collection";

// DataTable
export {
  DataTable,
  useDataTable,
  useDataTableContext,
  createColumnHelper,
  type DataTablePaginationProps,
  type DataTableRootProps,
  type Column,
  type DataTableData,
  type RowAction,
  type UseDataTableOptions,
  type UseDataTableReturn,
  type MetadataFieldOptions,
} from "./components/data-table";
export { useCollectionVariables } from "./hooks/use-collection-variables";
export {
  CollectionControlProvider,
  useCollectionControl,
} from "./contexts/collection-control-context";
