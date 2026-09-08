import { AppShellOutlet } from "@/components/content";
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb";
import { SidebarLayout } from "./sidebar-layout";
import { DefaultSidebar, type DefaultSidebarProps } from "./default-sidebar";
import { ContentContainer } from "./content-container";
import { Trigger } from "./sidebar-trigger";
import { GlobalHeader } from "./global-header";

/**
 * The default sidebar for {@link GlobalHeaderLayout}: `DefaultSidebar` with the
 * global-header mode baked in — its own header is dropped (the top bar owns the
 * title) and it collapses to a persistent icon rail, with the collapse toggle
 * pinned at the bottom-left. `hideHeader` and `iconRail` are forced so the mode
 * stays cohesive; everything else (`children`, `footer`, `hideSearch`) passes
 * through.
 */
export const GlobalHeaderDefaultSidebar = ({ footer, ...rest }: DefaultSidebarProps) => (
  <DefaultSidebar
    {...rest}
    hideHeader
    iconRail
    footer={
      footer ?? (
        <div className="astw:mt-auto astw:p-2">
          <Trigger />
        </div>
      )
    }
  />
);
GlobalHeaderDefaultSidebar.displayName = "GlobalHeaderLayout.DefaultSidebar";

type GlobalHeaderLayoutCommonProps = {
  /**
   * The app-wide top bar, spanning above the sidebar and content.
   *
   * @default <GlobalHeaderLayout.DefaultHeader />
   */
  header?: React.ReactNode;

  /**
   * The primary sidebar.
   *
   * @default <GlobalHeaderLayout.DefaultSidebar />
   */
  sidebar?: React.ReactNode;

  /** Whether the sidebar is expanded by default on desktop. @default true */
  defaultOpen?: boolean;

  /** Whether the sidebar can be collapsed. @default true */
  collapsible?: boolean;
};

/** Default content layout — you render the page via the `Outlet` render prop. */
type GlobalHeaderLayoutDefaultProps = GlobalHeaderLayoutCommonProps & {
  children?: (props: { Outlet: () => React.ReactNode }) => React.ReactNode;
  /** Not available alongside `children` — see the `body` overload. */
  body?: never;
};

/**
 * The eject: you own the whole region beside the sidebar (e.g. a table-of-
 * contents rail + content + an assistant panel), composed from the namespaced
 * building blocks. See {@link SidebarLayout}'s `body` slot.
 */
type GlobalHeaderLayoutBodyProps = GlobalHeaderLayoutCommonProps & {
  body: React.ReactNode;
  children?: never;
};

export type GlobalHeaderLayoutProps = GlobalHeaderLayoutDefaultProps | GlobalHeaderLayoutBodyProps;

/**
 * GlobalHeaderLayout — the app-shell layout with an app-wide header above the
 * whole shell and a sidebar that collapses to a persistent icon rail.
 *
 * It is a thin, opinionated wrapper over {@link SidebarLayout}: it wires the
 * global top bar, drops the sidebar's own header, and turns on the icon rail so
 * consumers get the intended experience without reconstructing it from
 * individual props. Reach for `SidebarLayout` directly when you need the
 * flexible primitive instead.
 *
 * @example
 * ```tsx
 * <GlobalHeaderLayout
 *   header={<GlobalHeaderLayout.DefaultHeader actions={[<AppearanceSwitcher key="a" />]} />}
 *   sidebar={
 *     <GlobalHeaderLayout.DefaultSidebar>
 *       <SidebarItem to="/" />
 *       <SidebarGroup title="Main" icon={<LayersIcon />}>
 *         <SidebarItem to="/dashboard" />
 *         <SidebarItem to="/orders" />
 *       </SidebarGroup>
 *     </GlobalHeaderLayout.DefaultSidebar>
 *   }
 * >
 *   {({ Outlet }) => <Outlet />}
 * </GlobalHeaderLayout>
 * ```
 */
export function GlobalHeaderLayout(props: GlobalHeaderLayoutProps) {
  const { header, sidebar, body, children, defaultOpen, collapsible } = props;

  // The global top bar is the app-wide header, so the content column carries no
  // header of its own — compose everything beside the sidebar via the body slot.
  const content = body ?? (
    <ContentContainer>
      {children ? children({ Outlet: AppShellOutlet }) : <AppShellOutlet />}
    </ContentContainer>
  );

  return (
    <SidebarLayout
      topBar={header ?? <GlobalHeader />}
      sidebar={sidebar ?? <GlobalHeaderDefaultSidebar />}
      body={content}
      defaultOpen={defaultOpen}
      collapsible={collapsible}
    />
  );
}

// Namespaced building blocks — parallel to `SidebarLayout`.
GlobalHeaderLayout.DefaultHeader = GlobalHeader;
GlobalHeaderLayout.DefaultSidebar = GlobalHeaderDefaultSidebar;
GlobalHeaderLayout.ContentContainer = ContentContainer;
GlobalHeaderLayout.Outlet = AppShellOutlet;
GlobalHeaderLayout.Trigger = Trigger;
GlobalHeaderLayout.Breadcrumb = DynamicBreadcrumb;
