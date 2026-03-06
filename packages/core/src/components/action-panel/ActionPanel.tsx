import { cn } from "../../lib/utils";
import type { ActionPanelProps, ActionItem } from "./types";

// ============================================================================
// ACTION ROW
// ============================================================================

const actionRowBaseClasses =
  "astw:flex astw:items-center astw:gap-2 astw:w-full astw:rounded-md astw:px-3 astw:py-2 astw:text-sm astw:font-medium astw:transition-colors astw:border astw:border-transparent astw:bg-transparent astw:text-left astw:cursor-pointer astw:[&_svg]:size-4 astw:[&_svg]:shrink-0";

const actionRowInteractiveClasses =
  "astw:hover:bg-accent astw:hover:text-accent-foreground astw:outline-none astw:focus-visible:ring-2 astw:focus-visible:ring-ring astw:focus-visible:ring-offset-2";

const actionRowDisabledClasses = "astw:pointer-events-none astw:opacity-50";

function ActionRow({ action }: { action: ActionItem }) {
  const { key, label, icon, onClick, href, disabled } = action;
  const isDisabled = Boolean(disabled);

  const content = (
    <>
      <span className="astw:flex astw:size-4 astw:items-center astw:justify-center" aria-hidden>
        {icon}
      </span>
      <span className="astw:min-w-0 astw:truncate">{label}</span>
    </>
  );

  const rowClasses = cn(
    actionRowBaseClasses,
    isDisabled ? actionRowDisabledClasses : actionRowInteractiveClasses,
  );

  if (href && !isDisabled) {
    return (
      <a
        href={href}
        className={rowClasses}
        data-slot="action-panel-item"
        data-key={key}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={rowClasses}
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      data-slot="action-panel-item"
      data-key={key}
    >
      {content}
    </button>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * ActionPanel — Card with title and list of actions (icon + label).
 *
 * Renders a card with a title and vertical list of action rows. Each row has an icon and label,
 * and is triggered by onClick (button) or href (link). Use `astw:w-full` so the panel fills
 * the width of its parent container.
 *
 * @example
 * ```tsx
 * <ActionPanel
 *   title="Actions"
 *   actions={[
 *     { key: "1", label: "Create invoice", icon: <ReceiptIcon />, onClick: () => openModal() },
 *     { key: "2", label: "View docs", icon: <DocIcon />, href: "/docs" },
 *   ]}
 * />
 * ```
 */
export function ActionPanel({ title, actions, className }: ActionPanelProps) {
  return (
    <div
      className={cn(
        "astw:w-full astw:bg-card astw:text-card-foreground astw:rounded-xl astw:border astw:shadow-xs",
        className,
      )}
    >
      {/* Header */}
      <div className="astw:px-6 astw:py-5">
        <h3 className="astw:text-lg astw:font-semibold astw:leading-none">{title}</h3>
      </div>

      {/* Action list */}
      <div className="astw:px-6 astw:pb-4">
        {actions.length === 0 ? (
          <p className="astw:text-sm astw:text-muted-foreground">No actions available</p>
        ) : (
          <div className="astw:flex astw:flex-col astw:gap-1" role="list">
            {actions.map((action) => (
              <div key={action.key} role="listitem">
                <ActionRow action={action} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ActionPanel;
