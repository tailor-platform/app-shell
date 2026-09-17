import {
  AppearanceSwitcher,
  Button,
  GlobalHeaderLayout,
  useLocation,
} from "@tailor-platform/app-shell";
import { CircleUserIcon, PanelRightIcon } from "lucide-react";
import { PANEL_SECTIONS, sectionId } from "./panel-sections";
import { useAssistant } from "./assistant-context";

// The demo runs the `GlobalHeaderLayout` mode: an app-wide GlobalHeader (title +
// route breadcrumb + these actions) over a sidebar that collapses to an icon
// rail. This file supplies the header actions and the `body` eject (a
// table-of-contents rail + content + an assistant panel). Search + notifications
// live in the sidebar (App.tsx).

const AssistantToggle = () => {
  const { toggleAssistant } = useAssistant();
  return (
    <Button variant="outline" size="icon" aria-label="Toggle assistant" onClick={toggleAssistant}>
      <PanelRightIcon />
    </Button>
  );
};

// Right-hand cluster of the GlobalHeader.
export const headerActions = [
  <Button key="account" variant="outline" size="icon" aria-label="Account">
    <CircleUserIcon />
  </Button>,
  <AppearanceSwitcher key="appearance" />,
  <AssistantToggle key="assistant" />,
];

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

// In-flow side column: animate its width (0 ↔ 24rem) so opening/closing slides
// the content over instead of snapping. The inner content keeps a fixed width so
// it doesn't reflow while the column animates; overflow-hidden clips it.
const AssistantPanel = ({ open, onClose }: { open: boolean; onClose: () => void }) => (
  <aside
    aria-hidden={!open}
    className={`hidden shrink-0 overflow-hidden bg-background transition-[width] duration-300 ease-in-out md:block ${
      open ? "w-96 border-l" : "w-0"
    }`}
  >
    <div className="flex h-full w-96 flex-col overflow-y-auto">
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
        <span className="text-sm font-semibold">Assistant</span>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div className="rounded-lg bg-muted p-3 text-sm">
          The global header spans above the primary sidebar and both side columns.
        </div>
        <div className="rounded-lg border p-3 text-sm text-muted-foreground">
          The primary sidebar collapses to an icon rail; its toggle sits at the bottom-left.
        </div>
      </div>
    </div>
  </aside>
);

/**
 * The `body` eject passed to `GlobalHeaderLayout` — it owns the whole region
 * beside the sidebar: a table-of-contents rail, the content column, and a
 * dockable assistant panel.
 */
export const PanelsBody = () => {
  const location = useLocation();
  const { assistantOpen, toggleAssistant } = useAssistant();
  const onPanelsPage = location.pathname === "/dashboard/panels";

  // Non-demo pages: just the content column (the global header is the top bar).
  if (!onPanelsPage) {
    return (
      <GlobalHeaderLayout.ContentContainer>
        <GlobalHeaderLayout.Outlet />
      </GlobalHeaderLayout.ContentContainer>
    );
  }

  return (
    <>
      <TocRail />
      <GlobalHeaderLayout.ContentContainer>
        <GlobalHeaderLayout.Outlet />
      </GlobalHeaderLayout.ContentContainer>
      {/* Always mounted so its width can animate open/closed. */}
      <AssistantPanel open={assistantOpen} onClose={toggleAssistant} />
    </>
  );
};
