import { cn } from "../../lib/utils";
import { Card } from "../card";
import { useRegisterCommandPaletteActions } from "../../contexts/command-palette-context";
import type { ActionPanelProps, ActionItem } from "./types";

// ============================================================================
// SPINNER (loading indicator for icon slot)
// ============================================================================

const iconSlotClasses = "astw:flex astw:size-4 astw:items-center astw:justify-center";

const ActionSpinner = () => (
  <svg
    className="astw:size-4 astw:animate-spin"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    data-testid="action-panel-spinner"
  >
    <circle
      cx="8"
      cy="8"
      r="6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeDasharray="24 24"
      strokeDashoffset="8"
    />
  </svg>
);

// ============================================================================
// ACTION ROW
// ============================================================================

const actionRowBaseClasses = cn(
  "astw:flex astw:items-center astw:gap-2 astw:w-full astw:rounded-md astw:px-3 astw:py-2",
  "astw:text-sm astw:font-medium astw:transition-colors astw:border astw:border-transparent",
  "astw:bg-transparent astw:text-left astw:cursor-pointer astw:[&_svg]:size-4 astw:[&_svg]:shrink-0",
);

const actionRowInteractiveClasses =
  "astw:hover:bg-accent astw:hover:text-accent-foreground astw:outline-none astw:focus-visible:ring-2 astw:focus-visible:ring-ring astw:focus-visible:ring-offset-2";

const actionRowDisabledClasses = "astw:pointer-events-none astw:opacity-50";

function ActionRow({ action }: { action: ActionItem }) {
  const { key, label, icon, onClick, disabled, loading } = action;
  const isDisabled = Boolean(disabled) || Boolean(loading);

  const content = (
    <>
      <span className={iconSlotClasses} aria-hidden>
        {loading ? <ActionSpinner /> : icon}
      </span>
      <span className="astw:min-w-0 astw:truncate">{label}</span>
    </>
  );

  const rowClasses = cn(
    actionRowBaseClasses,
    isDisabled ? actionRowDisabledClasses : actionRowInteractiveClasses,
  );

  return (
    <button
      type="button"
      className={rowClasses}
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      data-slot="action-panel-item"
      data-key={key}
    >
      {content}
    </button>
  );
}

// ============================================================================
// ACTION PANEL
// ============================================================================

/**
 * ActionPanel — Card with title and list of actions (icon + label).
 *
 * Each row has an icon and label and is triggered by onClick. For navigation, use
 * useNavigate() inside the callback (e.g. onClick: () => navigate("/path")).
 * Use `astw:w-full` so the panel fills the width of its parent container.
 *
 * When an action has `loading: true`, the row shows a spinner in the icon slot and is
 * non-interactive (useful for backend-driven actions: parent sets loading from mutation/request state).
 *
 * **CommandPalette integration** — Actions that are enabled (not `disabled`,
 * not `loading`, and have an `onClick` handler) are automatically registered
 * to the CommandPalette so users can discover and trigger them via keyboard
 * shortcut. The actions are grouped under the panel's `title`. Registration
 * is cleaned up when the ActionPanel unmounts.
 *
 * NOTE: This component must be rendered inside `AppShell` (which provides
 * `CommandPaletteProvider`). Rendering it outside that tree will throw.
 *
 * @example
 * ```tsx
 * const navigate = useNavigate();
 * <ActionPanel
 *   title="Actions"
 *   actions={[
 *     { key: "1", label: "Create invoice", icon: <ReceiptIcon />, onClick: () => openModal() },
 *     { key: "2", label: "View docs", icon: <DocIcon />, onClick: () => navigate("/docs") },
 *     { key: "3", label: "Saving…", icon: <SaveIcon />, onClick: () => {}, loading: true },
 *   ]}
 * />
 * ```
 */
export function ActionPanel({ title, actions, className }: ActionPanelProps) {
  // Register enabled actions to the CommandPalette context so they are
  // searchable and triggerable from the palette.
  useRegisterCommandPaletteActions(
    title,
    actions
      .filter((a) => !a.disabled && !a.loading && a.onClick)
      .map((a) => ({
        key: a.key,
        label: a.label,
        icon: a.icon,
        onSelect: a.onClick!,
      })),
  );

  return (
    <Card.Root className={cn("astw:min-w-69.5 astw:w-full", className)}>
      <Card.Header title={title} className="astw:px-8" />
      <Card.Content className="astw:px-4 astw:pb-4">
        {actions.length === 0 ? (
          <p className="astw:py-2 astw:pl-3 astw:text-sm astw:text-muted-foreground">
            No actions available
          </p>
        ) : (
          <div className="astw:flex astw:flex-col astw:gap-0" role="list">
            {actions.map((action) => (
              <div key={action.key} role="listitem">
                <ActionRow action={action} />
              </div>
            ))}
          </div>
        )}
      </Card.Content>
    </Card.Root>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ActionPanel;
