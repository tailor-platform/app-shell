import {
  AppShell,
  GlobalHeaderLayout,
  SidebarLayout,
  createColumnHelper,
} from "@tailor-platform/app-shell";

// Consumers must be able to export inferred types without repo-only declaration paths.
// Its private return type already required an annotation before unbundling.
export const columnHelper: ReturnType<typeof createColumnHelper<{ id: string }>> =
  createColumnHelper<{ id: string }>();
export const SidebarContent = SidebarLayout.ContentContainer;
export const GlobalHeader = GlobalHeaderLayout.DefaultHeader;
export const ConfiguredAppShell = AppShell.WithPages([]);
