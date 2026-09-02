import {
  AppearanceSwitcher,
  Button,
  SidebarLayout,
  useLocation,
  useOpenCommandPalette,
} from "@tailor-platform/app-shell";
import { CircleUserIcon, PanelRightIcon, SearchIcon } from "lucide-react";
import { PANEL_SECTIONS, sectionId } from "./panel-sections";
import { useAssistant } from "./assistant-context";

// Global-top layout: a single top bar spans above EVERYTHING (primary sidebar +
// content). The primary sidebar collapses to an icon rail with its own toggle at
// the bottom-left, so the top bar carries no sidebar toggle.
//
// Header zones: org + breadcrumb on the left, global search in the center, and
// account/appearance on the right. Notifications moved into the sidebar (App.tsx).

const actions = [
  <Button key="account" variant="outline" size="icon" aria-label="Account">
    <CircleUserIcon />
  </Button>,
  <AppearanceSwitcher key="appearance" />,
];

// Centered global search — opens the command palette (same one ⌘K opens),
// styled as an omnibar input. This replaces the sidebar's built-in Search.
const HeaderSearch = () => {
  const openPalette = useOpenCommandPalette();
  return (
    <button
      type="button"
      onClick={() => openPalette()}
      className="flex h-9 w-full max-w-md items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
    >
      <SearchIcon className="size-4 shrink-0" />
      <span className="flex-1 text-left">Search…</span>
      <span className="pointer-events-none shrink-0 select-none text-muted-foreground">⌘K</span>
    </button>
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
  <div className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b px-4">
    {/* Left zone: org name + breadcrumb */}
    <div className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-sm font-semibold">File-Based Routing Demo</span>
      <div className="mx-1 h-5 w-px shrink-0 bg-border" />
      <div className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
        <span>Dashboard</span>
        <span>/</span>
        <span className="font-medium text-foreground">Body Slot</span>
      </div>
    </div>
    {/* Center zone: global search */}
    <div className="flex w-[28rem] max-w-full justify-center">
      <HeaderSearch />
    </div>
    {/* Right zone: account + appearance + assistant */}
    <div className="flex items-center justify-end gap-2">
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
