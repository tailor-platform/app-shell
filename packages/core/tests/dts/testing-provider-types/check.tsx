import { AppShell } from "@tailor-platform/app-shell";
import {
  AppShell as LegacyAppShell,
  AppShellTestingProvider,
  TestRouter,
  type AppShellTestingProviderProps,
  type TestAppShellProps,
  type TestRouterProps,
} from "@tailor-platform/app-shell/testing";

export const props: AppShellTestingProviderProps = { initialEntries: ["/dashboard"] };
export const shell = (
  <AppShellTestingProvider {...props}>
    <AppShell />
  </AppShellTestingProvider>
);

// @ts-expect-error Memory routing requires an explicit initial history stack.
export const missingEntries = <AppShellTestingProvider />;
// @ts-expect-error History entries must be paths, not numbers.
export const invalidEntries = <AppShellTestingProvider initialEntries={[123]} />;
// @ts-expect-error The provider always selects memory routing; there is no memory option.
export const providerMemory = <AppShellTestingProvider initialEntries={["/"]} memory />;
// @ts-expect-error AppShell itself must not accept memory-routing props.
export const shellMemory = <AppShell memory initialEntries={["/"]} />;
// Deprecated exports retain their routing contracts while consumers migrate.
export const legacyMemoryProps: TestAppShellProps = {
  memory: true,
  initialEntries: ["/dashboard"],
};
export const legacyBrowserProps: TestAppShellProps = { memory: false };
export const legacyDefaultProps: TestAppShellProps = {};
export const legacyMemoryShell = <LegacyAppShell {...legacyMemoryProps} />;
export const legacyBrowserShell = <LegacyAppShell {...legacyBrowserProps} />;
export const legacyDefaultShell = <LegacyAppShell {...legacyDefaultProps} />;
// @ts-expect-error Legacy memory routing still requires an initial history stack.
export const legacyMissingEntries = <LegacyAppShell memory />;
// @ts-expect-error Legacy history entries must remain strings.
export const legacyInvalidEntries = <LegacyAppShell memory initialEntries={[123]} />;
export const LegacyConfiguredShell = LegacyAppShell.WithPages([]);
export const legacyConfiguredShell = <LegacyConfiguredShell />;

export const routerProps: TestRouterProps = {
  path: "/dashboard",
  initialEntries: ["/dashboard"],
  initialIndex: 0,
};
export const router = <TestRouter {...routerProps}>Dashboard</TestRouter>;
