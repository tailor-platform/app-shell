export { AppShell, type AppShellProps } from "./components/appshell";
export { SidebarLayout, DefaultSidebar, DefaultHeader } from "./components/sidebar";
export { CommandPalette } from "./components/command-palette";
export {
  useOpenCommandPalette,
  useRegisterCommandPaletteActions,
  type CommandPaletteAction,
  type CommandPaletteSearchResult,
  type OpenCommandPaletteOptions,
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
  type DefaultHeaderProps,
} from "./components/sidebar";

// Guard component for conditional rendering
export { WithGuard, type WithGuardProps } from "./components/with-guard";

export {
  useAppShell,
  useAppShellConfig,
  useAppShellData,
  useResolvedLocale,
  useTimeZone,
  type AppInfo,
  type AppInfoEntry,
  type TimeZone,
} from "./contexts/appshell-context";
export { useAppShellScrollContainer } from "./contexts/scroll-container-context";
export { useTheme, type ColorTheme, type ResolvedColorTheme } from "./contexts/theme-context";
export { AppearanceSwitcher } from "./components/appearance-switcher";
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
export {
  createAIGatewayClient,
  type AIGatewayClient,
  type AIGatewayChatMessage,
  type AIGatewayChatRequest,
  type AIGatewayTool,
  type AIGatewayToolCall,
  type AIGatewayFunctionTool,
  type AIGatewayProviderTool,
  type AIChatCompletionEvent,
  type AIChatSource,
} from "./ai/client";
export { useAIChat, type AIChatMessage, type AIChatStatus } from "./ai/use-ai-chat";
export {
  defineAIChatTool,
  aiToolSchema,
  aiProviderTool,
  type AIChatConfiguredTool,
  type AIChatToolContext,
  type AIChatToolSchema,
  type AILocalTool,
  type AIOpenAIWebSearchTool,
  type OpenAIWebSearchToolOptions,
} from "./ai/tools";

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

// React Router surface. AppShell owns the router, so apps consume it from here
// and never depend on `react-router` directly — a second copy is a second,
// disjoint router context.
//
// Withheld: router construction (`createBrowserRouter`, `RouterProvider`,
// `MemoryRouter`, `Routes`, `Route`), available for tests from
// `@tailor-platform/app-shell/testing`; and the data-router APIs
// (`useLoaderData`, `Form`, `useSubmit`, `useFetcher`), which AppShell does not
// wire up. Missing something? Add it here rather than in an app's dependencies.
export {
  useLocation,
  useParams,
  useSearchParams,
  useMatch,
  useResolvedPath,
  useNavigate,
  useNavigation,
  Link,
  NavLink,
  Navigate,
  useBlocker,
  useBeforeUnload,
  useRouteError,
} from "react-router";

export type {
  Blocker,
  BlockerFunction,
  LinkProps,
  Location,
  NavLinkProps,
  NavigateFunction,
  NavigateOptions,
  Navigation,
  Params,
  PathMatch,
  To,
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
export { Alert, alertVariants, type AlertProps } from "./components/alert";
export { Badge, badgeVariants, type BadgeProps } from "./components/badge";
export type { BadgeVariant, BadgeOptions } from "./components/badge-list";
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
export {
  Attachment,
  useAttachment,
  type AttachmentProps,
  type AttachmentItem,
  type AttachmentOperation,
  type UseAttachmentOptions,
} from "./components/attachment";
export { MetricCard, type MetricCardProps } from "./components/metric-card";
export {
  DocumentProgressCard,
  type DocumentProgressCardProps,
} from "./components/document-progress-card";
export { Layout, type LayoutProps } from "./components/layout";
export { Grid, type GridProps, type GridItemProps } from "./components/grid";
export { Button, buttonVariants, type ButtonProps } from "./components/button";
export { Avatar, avatarVariants, type AvatarProps } from "./components/avatar";
export { Input, type InputProps } from "./components/input";
export { Textarea, type TextareaProps } from "./components/textarea";
export { Checkbox, type CheckboxProps } from "./components/checkbox";
export { Table } from "./components/table";
export { Card } from "./components/card";
export { Dialog } from "./components/dialog";
export { Field } from "./components/field";
export { Fieldset } from "./components/fieldset";
export { Form, type FormProps } from "./components/form";
export { Menu } from "./components/menu";
// Shared by the `position` prop on `Menu.Content` and `Tooltip.Content`.
export type { PositionProps } from "./lib/position";
export { Sheet } from "./components/sheet";
export { Tabs } from "./components/tabs";
export { Tooltip } from "./components/tooltip";
export { Select, type SelectAsyncFetcher } from "./components/select";
export { Combobox, type ComboboxAsyncFetcher } from "./components/combobox";
export { Autocomplete, type AutocompleteAsyncFetcher } from "./components/autocomplete";
export {
  DateField,
  DatePicker,
  DateRangePicker,
  type DateFieldProps,
  type DatePickerProps,
  type DateRangePickerProps,
} from "./components/date-field";
export {
  Calendar,
  RangeCalendar,
  type CalendarProps,
  type RangeCalendarProps,
  type DateRange,
} from "./components/calendar";

// @internationalized/date re-exports — consumers import date helpers/types from
// app-shell and install no extra packages. The long tail is available via direct
// import of @internationalized/date (dedupes to the same instance).
export {
  getLocalTimeZone,
  parseDate,
  parseDateTime,
  parseAbsolute,
  parseZonedDateTime,
  type CalendarDate,
  type CalendarDateTime,
  type ZonedDateTime,
  type Time,
  type DateValue,
} from "@internationalized/date";
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
  type CollectionInitialState,
  type CollectionParams,
  type CollectionPersistedState,
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
  type DataTableFilterConfig,
  type HeaderRenderContext,
  type RowAction,
  type UseDataTableOptions,
  type UseDataTableReturn,
  type MetadataFieldOptions,
  type DataTableContextValue,
} from "./components/data-table";
export { useCollectionVariables } from "./hooks/use-collection-variables";
export { useURLCollectionVariables, withURLCollectionState } from "./lib/collection-url-state";
export {
  CollectionControlProvider,
  useCollectionControl,
} from "./contexts/collection-control-context";

export {
  Timeline,
  type TimelineAxis,
  type TimelineAxisLevel,
  type TimelineAxisSpan,
  type TimelineAxisTick,
  type TimelineBand,
  type TimelineDecorations,
  type TimelineGuide,
  type TimelineIntervalProps,
  type TimelineLinkDefaults,
  type TimelineLinkProps,
  type TimelineMarker,
  type TimelineRootProps,
  type TimelineRowBackground,
  type TimelineRowProps,
  type TimelineViewportProps,
} from "./components/timeline";
