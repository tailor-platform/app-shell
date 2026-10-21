import {
  AppearanceSwitcher,
  Button,
  GlobalHeaderLayout,
  useLocation,
} from "@tailor-platform/app-shell";
import { CircleUserIcon, PanelRightIcon } from "lucide-react";
import { PANEL_SECTIONS, sectionId } from "./panel-sections";
import { useAssistant } from "./assistant-context";
import { AssistantChat } from "./assistant-chat";

// The demo runs the `GlobalHeaderLayout` mode: an app-wide GlobalHeader (title +
// route breadcrumb + these actions) over a sidebar that collapses to an icon
// rail. This file supplies the header actions and the `body` eject (a
// table-of-contents rail + content + an assistant panel). Search + notifications
// live in the sidebar (App.tsx).

const AssistantToggle = () => {
  const { assistantOpen, toggleAssistant } = useAssistant();
  return (
    <Button
      id="assistant-toggle"
      variant="outline"
      size="icon"
      aria-label="Toggle assistant"
      aria-controls="assistant-panel"
      aria-expanded={assistantOpen}
      onClick={toggleAssistant}
    >
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
    id="assistant-panel"
    aria-label="Assistant"
    aria-hidden={!open}
    inert={!open}
    className={`hidden shrink-0 overflow-hidden bg-background transition-[width] duration-300 ease-in-out md:block ${
      open ? "w-96 border-l" : "w-0"
    }`}
  >
    <div className="flex h-full min-h-0 w-96 flex-col">
      <AssistantChat onClose={onClose} />
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

  const closeAssistant = () => {
    toggleAssistant();
    document.getElementById("assistant-toggle")?.focus();
  };

  return (
    <>
      {onPanelsPage ? <TocRail /> : null}
      <GlobalHeaderLayout.ContentContainer>
        <GlobalHeaderLayout.Outlet />
      </GlobalHeaderLayout.ContentContainer>
      {/* Always mounted across routes and toggles to preserve the active conversation. */}
      <AssistantPanel open={assistantOpen} onClose={closeAssistant} />
    </>
  );
};
