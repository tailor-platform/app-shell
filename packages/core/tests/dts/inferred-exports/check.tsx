import {
  AppShell,
  GlobalHeaderLayout,
  SidebarLayout,
  createColumnHelper,
} from "@tailor-platform/app-shell";
import { AppShellTestingProvider } from "@tailor-platform/app-shell/testing";

// createColumnHelper's private return type requires an explicit annotation.
export const columnHelper: ReturnType<typeof createColumnHelper<{ id: string }>> =
  createColumnHelper<{ id: string }>();
export const SidebarContent = SidebarLayout.ContentContainer;
export const GlobalHeader = GlobalHeaderLayout.DefaultHeader;
export const ConfiguredAppShell = AppShell.WithPages([]);
export const TestingProvider = AppShellTestingProvider;
