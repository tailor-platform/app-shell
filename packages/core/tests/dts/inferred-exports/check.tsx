import {
  AppShell,
  GlobalHeaderLayout,
  SidebarLayout,
  createColumnHelper,
  getLocalTimeZone,
  today,
  type CalendarDate,
} from "@tailor-platform/app-shell";
import { AppShellTestingProvider } from "@tailor-platform/app-shell/testing";

// createColumnHelper's private return type requires an explicit annotation.
export const columnHelper: ReturnType<typeof createColumnHelper<{ id: string }>> =
  createColumnHelper<{ id: string }>();
export const SidebarContent = SidebarLayout.ContentContainer;
export const GlobalHeader = GlobalHeaderLayout.DefaultHeader;
export const PublicAppShell = AppShell;
export const TestingProvider = AppShellTestingProvider;
export const localToday: CalendarDate = today(getLocalTimeZone());
