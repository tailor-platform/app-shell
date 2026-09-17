import {
  AppearanceSwitcher,
  Button,
  SidebarLayout,
  useAppShellSidebar,
  useLocation,
} from "@tailor-platform/app-shell";
import { BellIcon, CircleUserIcon, PanelRightIcon } from "lucide-react";
import { useState } from "react";
import { PANEL_SECTIONS, sectionId } from "./panel-sections";

const Header = (
  <SidebarLayout.DefaultHeader
    actions={[
      <Button key="notifications" variant="outline" size="icon" aria-label="Notifications">
        <BellIcon />
      </Button>,
      <Button key="account" variant="outline" size="icon" aria-label="Account">
        <CircleUserIcon />
      </Button>,
      <AppearanceSwitcher key="appearance" />,
    ]}
  />
);

/**
 * Reproduces knowledge#312 — a page-specific table-of-contents rail sitting
 * flush between the main nav sidebar and the content column.
 */
const TocRail = () => {
  // Proves the supported replacement for the MutationObserver hack: read the
  // main sidebar's collapsed state without touching [data-state] in the DOM.
  const { open, toggle } = useAppShellSidebar();

  return (
    <aside className="hidden w-64 shrink-0 flex-col overflow-y-auto border-r bg-background md:flex">
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 px-4">
        <span className="text-sm font-semibold">Contents</span>
        <Button variant="ghost" size="sm" onClick={toggle}>
          {open ? "Hide nav" : "Show nav"}
        </Button>
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
};

/**
 * Reproduces knowledge#345 — an assistant panel docked flush against the
 * viewport edge, while the content column keeps its normal inset chrome.
 */
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
        This panel is flush against the viewport edge — no `:has()` overrides, no `!important`, no
        injected global CSS.
      </div>
      <div className="rounded-lg border p-3 text-sm text-muted-foreground">
        The content column to the left still has its normal breadcrumb header and `md:px-8` padding,
        and still scrolls on its own.
      </div>
    </div>
  </aside>
);

/**
 * The `body` slot is configured once at the app level, so page-specific columns
 * are driven off the current route. Everything here is a flex row beside the
 * sidebar, so it all reflows when the sidebar collapses.
 */
export const PanelsBody = () => {
  const location = useLocation();
  const [assistantOpen, setAssistantOpen] = useState(true);
  const onPanelsPage = location.pathname === "/dashboard/panels";

  return (
    <>
      {onPanelsPage && <TocRail />}
      <SidebarLayout.ContentContainer
        header={
          onPanelsPage ? (
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">{Header}</div>
              <Button
                variant="outline"
                size="icon"
                aria-label="Toggle assistant"
                onClick={() => setAssistantOpen((prev) => !prev)}
              >
                <PanelRightIcon />
              </Button>
            </div>
          ) : (
            Header
          )
        }
      >
        <SidebarLayout.Outlet />
      </SidebarLayout.ContentContainer>
      {onPanelsPage && assistantOpen && <AssistantPanel onClose={() => setAssistantOpen(false)} />}
    </>
  );
};
