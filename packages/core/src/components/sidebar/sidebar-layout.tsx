import { SidebarProvider } from "@/components/sidebar";
import { AppShellOutlet } from "@/components/content";
import { DefaultSidebar } from "./default-sidebar";
import { DefaultHeader } from "./default-header";
import { ContentContainer } from "./content-container";
import { Trigger } from "./sidebar-trigger";

export type SidebarLayoutProps = {
  /**
   * Custom content renderer.
   *
   * Ignored when `body` is set — `body` replaces the region this renders into.
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
   * Custom header content. Replaces the whole top-bar region.
   *
   * Omit it for the built-in header. To slightly extend the built-in header
   * (e.g. add a notification bell), pass `<SidebarLayout.DefaultHeader />` with
   * its `actions` slot rather than reconstructing the header from scratch.
   *
   * Ignored when `body` is set — with `body` you place the header yourself,
   * inside (or outside) `<SidebarLayout.ContentContainer>`.
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
   * Setting `body` takes over the whole region, so `header` and `children` no
   * longer apply and are ignored.
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
  body?: React.ReactNode;

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
};

export function SidebarLayout(props: SidebarLayoutProps) {
  if (props.body && (props.header || props.children)) {
    console.warn(
      "[AppShell] SidebarLayout received `body` alongside `header` and/or `children`. " +
        "`body` replaces the entire region to the right of the sidebar, so those props are ignored. " +
        "Place your header inside `body` (e.g. via <SidebarLayout.ContentContainer header={…}>) instead.",
    );
  }

  return (
    <SidebarProvider
      defaultOpen={props.defaultOpen}
      collapsible={props.collapsible}
      className="astw:flex astw:flex-col"
    >
      <div className="astw:flex astw:flex-1 astw:min-h-0">
        {props.sidebar ?? <DefaultSidebar />}
        {props.body ?? (
          <ContentContainer header={props.header ?? <DefaultHeader />}>
            {props.children ? props.children({ Outlet: AppShellOutlet }) : <AppShellOutlet />}
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
