import {
  AppearanceSwitcher,
  Button,
  Menu,
  SidebarLayout,
  useLocation,
} from "@tailor-platform/app-shell";
import { CircleUserIcon, EllipsisIcon, PanelRightIcon } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { PANEL_SECTIONS, sectionId } from "./panel-sections";
import { useAssistant } from "./assistant-context";

// Global-top layout: a single top bar spans above EVERYTHING (primary sidebar +
// content). The primary sidebar collapses to an icon rail with its own toggle at
// the bottom-left, so the top bar carries no sidebar toggle.
//
// Header zones: org + breadcrumb on the left, account/appearance on the right.
// Search + notifications live in the sidebar (App.tsx).

const actions = [
  <Button key="account" variant="outline" size="icon" aria-label="Account">
    <CircleUserIcon />
  </Button>,
  <AppearanceSwitcher key="appearance" />,
];

// The breadcrumb trail — shared by the full breadcrumb (wide) and the
// collapsed "⋯" menu (narrow).
const BREADCRUMB = ["Dashboard", "Body Slot"];

// Collapsed breadcrumb for narrow viewports — a "⋯" button that opens the trail
// as a menu.
const BreadcrumbMenu = () => (
  <Menu.Root modal={false}>
    <Menu.Trigger
      render={<Button type="button" variant="ghost" size="icon" aria-label="Breadcrumb" />}
    >
      <EllipsisIcon />
    </Menu.Trigger>
    <Menu.Content position={{ side: "bottom", align: "start", sideOffset: 4 }}>
      {BREADCRUMB.map((crumb) => (
        <Menu.Item key={crumb}>{crumb}</Menu.Item>
      ))}
    </Menu.Content>
  </Menu.Root>
);

const FullBreadcrumb = () => (
  <div className="flex items-center gap-1.5 whitespace-nowrap text-sm text-muted-foreground">
    {BREADCRUMB.map((crumb, i) => (
      <span key={crumb} className="flex items-center gap-1.5">
        {i > 0 && <span>/</span>}
        <span className={i === BREADCRUMB.length - 1 ? "font-medium text-foreground" : ""}>
          {crumb}
        </span>
      </span>
    ))}
  </div>
);

// Shows the full breadcrumb while it fits; collapses to the "⋯" menu only when it
// would actually overflow the space available (measured, not a fixed
// breakpoint). A hidden probe holds the breadcrumb's natural width so the
// decision stays stable in both states.
const ResponsiveBreadcrumb = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = () => {
      const probe = probeRef.current;
      if (probe) setCollapsed(probe.offsetWidth > container.clientWidth);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      ref={containerRef}
      aria-label="Breadcrumb"
      className="flex min-w-0 flex-1 items-center overflow-hidden"
    >
      {/* Off-flow probe at natural width — the measuring reference. */}
      <div ref={probeRef} aria-hidden className="pointer-events-none invisible absolute">
        <FullBreadcrumb />
      </div>
      {collapsed ? <BreadcrumbMenu /> : <FullBreadcrumb />}
    </nav>
  );
};

const AssistantToggle = () => {
  const { toggleAssistant } = useAssistant();
  return (
    <Button variant="outline" size="icon" aria-label="Toggle assistant" onClick={toggleAssistant}>
      <PanelRightIcon />
    </Button>
  );
};

const TocRail = () => (
  <aside className="hidden w-64 shrink-0 flex-col overflow-y-auto border-r bg-background md:flex">
    <div className="flex h-14 shrink-0 items-center px-4">
      <span className="text-sm font-semibold">Contents</span>
    </div>
    <nav className="flex flex-col gap-0.5 px-2 pb-4">
      {PANEL_SECTIONS.map((section) => (
        <a
          key={section}
          href={`#${sectionId(section)}`}
          className="rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          {section}
        </a>
      ))}
    </nav>
  </aside>
);

const AssistantPanel = ({ onClose }: { onClose: () => void }) => (
  <aside className="hidden w-96 shrink-0 flex-col overflow-y-auto border-l bg-background md:flex">
    <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
      <span className="text-sm font-semibold">Assistant</span>
      <Button variant="ghost" size="sm" onClick={onClose}>
        Close
      </Button>
    </div>
    <div className="flex flex-col gap-3 p-4">
      <div className="rounded-lg bg-muted p-3 text-sm">
        Global top bar spans above the primary sidebar and both side columns.
      </div>
      <div className="rounded-lg border p-3 text-sm text-muted-foreground">
        The primary sidebar collapses to an icon rail; its toggle sits at the bottom-left.
      </div>
    </div>
  </aside>
);

/**
 * The global top bar — passed to `SidebarLayout topBar` so it spans above the
 * primary sidebar and the content region. Carries the org name + breadcrumb +
 * actions; no sidebar toggle (that lives at the sidebar's bottom-left).
 */
export const GlobalTopBar = () => (
  <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4 sm:gap-4">
    {/* Left: org name + breadcrumb (search lives in the sidebar now). The
        breadcrumb collapses to a "⋯" menu only when it runs out of room. */}
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <span className="shrink-0 truncate text-sm font-semibold">File-Based Routing Demo</span>
      <div className="mx-1 h-5 w-px shrink-0 bg-border" />
      <ResponsiveBreadcrumb />
    </div>
    {/* Right: account + appearance + assistant */}
    <div className="flex items-center gap-2">
      {actions}
      <AssistantToggle />
    </div>
  </div>
);

export const PanelsBody = () => {
  const location = useLocation();
  const { assistantOpen, toggleAssistant } = useAssistant();
  const onPanelsPage = location.pathname === "/dashboard/panels";

  // Non-demo pages: just the content column (the global top bar is the header).
  if (!onPanelsPage) {
    return (
      <SidebarLayout.ContentContainer>
        <SidebarLayout.Outlet />
      </SidebarLayout.ContentContainer>
    );
  }

  return (
    <>
      <TocRail />
      <SidebarLayout.ContentContainer>
        <SidebarLayout.Outlet />
      </SidebarLayout.ContentContainer>
      {assistantOpen && <AssistantPanel onClose={toggleAssistant} />}
    </>
  );
};
