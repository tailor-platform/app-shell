import { AppearanceSwitcher } from "@/components/appearance-switcher";
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb";
import { useAppShellConfig } from "@/contexts/appshell-context";

export type GlobalHeaderProps = {
  /**
   * The right-hand cluster of the header. Rendered in a horizontal,
   * vertically-centered row with consistent spacing — you don't wrap it
   * yourself. Accepts a single node or an array of nodes.
   *
   * **`actions` replaces the entire right-hand cluster, including the
   * appearance switcher.** When omitted, it defaults to just the
   * `<AppearanceSwitcher />`. Include `<AppearanceSwitcher />` in your array to
   * keep it. Passing `actions={[]}` renders an empty right side.
   *
   * @default [<AppearanceSwitcher />]
   */
  actions?: React.ReactNode | React.ReactNode[];
};

/**
 * GlobalHeader — the app-wide top bar for {@link GlobalHeaderLayout}.
 *
 * Codifies the header layout so consumers don't hand-assemble it: the app title
 * (from `AppShell`) and the route-driven breadcrumb sit on the left, and the
 * `actions` cluster (defaulting to the appearance switcher) on the right.
 *
 * Use it via the `GlobalHeaderLayout.DefaultHeader` namespace.
 *
 * @example
 * ```tsx
 * <GlobalHeaderLayout
 *   header={
 *     <GlobalHeaderLayout.DefaultHeader
 *       actions={[<AccountMenu key="account" />, <AppearanceSwitcher key="appearance" />]}
 *     />
 *   }
 * />
 * ```
 */
export const GlobalHeader = ({ actions }: GlobalHeaderProps) => {
  const { title, icon } = useAppShellConfig();
  // React ignores null/false, so no normalization is needed; fall back to the
  // appearance switcher when omitted.
  const resolvedActions = actions === undefined ? <AppearanceSwitcher /> : actions;

  return (
    <header className="astw:flex astw:h-14 astw:shrink-0 astw:items-center astw:justify-between astw:gap-2 astw:border-b astw:border-border astw:px-4">
      <div className="astw:flex astw:min-w-0 astw:flex-1 astw:items-center astw:gap-2">
        {icon}
        <span className="astw:shrink-0 astw:truncate astw:text-sm astw:font-semibold">{title}</span>
        <div className="astw:mx-1 astw:h-5 astw:w-px astw:shrink-0 astw:bg-border" />
        <div className="astw:flex astw:min-w-0 astw:flex-1 astw:items-center astw:overflow-hidden">
          <DynamicBreadcrumb />
        </div>
      </div>
      <div className="astw:flex astw:shrink-0 astw:flex-row astw:items-center astw:gap-2">
        {resolvedActions}
      </div>
    </header>
  );
};
GlobalHeader.displayName = "GlobalHeaderLayout.DefaultHeader";
