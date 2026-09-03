import { SidebarProvider } from "@/components/sidebar";
import { cn } from "@/lib/utils";
import { AppShellOutlet } from "@/components/content";
import { DefaultSidebar } from "./default-sidebar";
import { DefaultHeader } from "./default-header";
import { ContentContainer } from "./content-container";
import { Trigger } from "./sidebar-trigger";

type SidebarLayoutCommonProps = {
  /**
   * Custom sidebar content. Replaces the whole sidebar region.
   *
   * @default <SidebarLayout.DefaultSidebar />
   * @example
   * ```tsx
   * <SidebarLayout sidebar={<MyCustomSidebar />} />
   * ```
   */
  sidebar?: React.ReactNode;

  /**
   * Whether the sidebar is open by default on desktop.
   *
   * @default true
   */
  defaultOpen?: boolean;

  /**
   * Whether the sidebar can be collapsed.
   * When set to `false`, the sidebar is always visible and cannot be toggled.
   * `defaultOpen` is ignored when this is `false`.
   *
   * @default true
   */
  collapsible?: boolean;

  /**
   * A global top bar rendered above **everything** — spanning the full width
   * across the top of the primary sidebar and the content region alike. The
   * sidebar and content then sit in a row beneath it.
   *
   * This is distinct from the content `header` (which sits above the content
   * column only): use `topBar` when you want a single app-wide bar over the
   * whole layout. Pair it with `<SidebarLayout.DefaultSidebar hideHeader />`
   * (and often `iconRail`) so the sidebar defers its own header to the bar.
   *
   * The bar should be `3.5rem` (h-14) tall: the fixed sidebar is offset to start
   * just beneath it (via the internal `--appshell-topbar-h`, fixed at `3.5rem`
   * while a `topBar` is present).
   */
  topBar?: React.ReactNode;
};

/**
 * The default layout: AppShell owns the content column, you customise its
 * header and content.
 */
type SidebarLayoutDefaultProps = SidebarLayoutCommonProps & {
  /**
   * Custom header content. Replaces the whole top-bar region.
   *
   * Omit it for the built-in header. To slightly extend the built-in header
   * (e.g. add a notification bell), pass `<SidebarLayout.DefaultHeader />` with
   * its `actions` slot rather than reconstructing the header from scratch.
   *
   * @default <SidebarLayout.DefaultHeader />
   * @example
   * ```tsx
   * // Extend the built-in header:
   * <SidebarLayout
   *   header={
   *     <SidebarLayout.DefaultHeader
   *       actions={[<NotificationBell key="bell" />, <AppearanceSwitcher key="appearance" />]}
   *     />
   *   }
   * />
   *
   * // Or replace it entirely:
   * <SidebarLayout header={<MyCustomHeader />} />
   * ```
   */
  header?: React.ReactNode;

  /**
   * Custom content renderer.
   *
   * @example
   * ```tsx
   * <SidebarLayout>
   *   {({ Outlet }) => (
   *     <>
   *       <CustomHeader />
   *       <Outlet />
   *       <CustomFooter />
   *     </>
   *   )}
   * </SidebarLayout>
   * ```
   */
  children?: (props: { Outlet: () => React.ReactNode }) => React.ReactNode;

  /** Not available alongside `header`/`children` — see the `body` overload. */
  body?: never;
};

/**
 * The eject: you own the whole region beside the sidebar, including where the
 * header goes. `header` and `children` are unavailable here by construction —
 * they describe a content column you are now supplying yourself.
 */
type SidebarLayoutBodyProps = SidebarLayoutCommonProps & {
  /**
   * Replaces everything to the right of the sidebar — the escape hatch for
   * page layouts the default content column can't express, such as a
   * table-of-contents rail or an assistant panel docked flush against the
   * viewport edge.
   *
   * Whatever you pass becomes a flex row alongside the sidebar, so it widens
   * and narrows with the sidebar automatically. Compose it from the namespaced
   * building blocks rather than rebuilding them:
   *
   * - `<SidebarLayout.ContentContainer>` — the stock content column (inset
   *   padding, pinned header slot, scroll region, `useAppShellScrollContainer()`)
   * - `<SidebarLayout.Outlet />` — the current page
   * - `<SidebarLayout.DefaultHeader />` — the built-in top bar
   * - `<SidebarLayout.Trigger />` — the sidebar collapse toggle
   * - `useAppShellSidebar()` — subscribe to the sidebar's collapsed state
   *
   * The header lives inside `body` too — pass it to `ContentContainer` so it
   * stays pinned above that column's scroll region.
   *
   * @example
   * ```tsx
   * <SidebarLayout
   *   body={
   *     <>
   *       <aside className="w-64 shrink-0 border-r overflow-y-auto">
   *         <TableOfContents />
   *       </aside>
   *       <SidebarLayout.ContentContainer header={<SidebarLayout.DefaultHeader />}>
   *         <SidebarLayout.Outlet />
   *       </SidebarLayout.ContentContainer>
   *       <aside className="w-96 shrink-0 border-l overflow-y-auto">
   *         <AssistantPanel />
   *       </aside>
   *     </>
   *   }
   * />
   * ```
   */
  body: React.ReactNode;

  /** Place your header inside `body`, via `<SidebarLayout.ContentContainer header={…}>`. */
  header?: never;

  /** Place your content inside `body`, via `<SidebarLayout.Outlet />`. */
  children?: never;
};

/**
 * Either the default layout (`header` + `children`) or the ejected one (`body`)
 * — never both. Passing `body` alongside `header`/`children` is a type error,
 * because `body` replaces the very region those two describe.
 */
export type SidebarLayoutProps = SidebarLayoutDefaultProps | SidebarLayoutBodyProps;

export function SidebarLayout(props: SidebarLayoutProps) {
  const { sidebar, header, children, body, defaultOpen, collapsible, topBar } = props;

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      collapsible={collapsible}
      // When a global top bar is present, publish its height so the fixed sidebar
      // starts below it (see --appshell-topbar-h in sidebar.tsx) instead of
      // overlapping it.
      className={cn("astw:flex astw:flex-col", topBar && "astw:[--appshell-topbar-h:3.5rem]")}
    >
      {topBar}
      <div className="astw:flex astw:flex-1 astw:min-h-0">
        {sidebar ?? <DefaultSidebar />}
        {body ?? (
          <ContentContainer header={header ?? <DefaultHeader />}>
            {children ? children({ Outlet: AppShellOutlet }) : <AppShellOutlet />}
          </ContentContainer>
        )}
      </div>
    </SidebarProvider>
  );
}

// Namespaced building blocks for composing the default layout. `DefaultSidebar`
// remains available as a top-level export for backwards compatibility.
SidebarLayout.DefaultSidebar = DefaultSidebar;
SidebarLayout.DefaultHeader = DefaultHeader;
// Building blocks for the `body` slot.
SidebarLayout.ContentContainer = ContentContainer;
SidebarLayout.Outlet = AppShellOutlet;
SidebarLayout.Trigger = Trigger;
