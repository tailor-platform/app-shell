import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/checkbox";
import { useDataTableT } from "./i18n";

/** Width of one indent step and of the caret, so a child's caret sits under its parent's checkbox (or label). */
const STEP_CLASS = "astw:size-5 astw:shrink-0";

interface SubRowsCellContentProps {
  depth: number;
  hasSubRows: boolean;
  expanded: boolean;
  /** The row's identity for the caret's name ("Expand row Assets"). */
  label: string | undefined;
  onToggle: () => void;
  /** Present when selection propagates: the checkbox sits here, indented with the row. */
  selection?: {
    checked: boolean;
    indeterminate: boolean;
    onToggle: () => void;
    disabled?: boolean;
  };
  children: ReactNode;
}

/**
 * @internal
 * The hierarchy column's cell content: one indent step per level, the open /
 * close caret (or its space, so labels line up), the selection checkbox when
 * it propagates, then the column's own content.
 *
 * The caret is a real button with `aria-expanded`, reached with Tab and
 * worked with Enter / Space, like the detail-panel chevron.
 */
function SubRowsCellContent({
  depth,
  hasSubRows,
  expanded,
  label,
  onToggle,
  selection,
  children,
}: SubRowsCellContentProps) {
  const t = useDataTableT();
  return (
    <span
      data-slot="data-table-sub-rows-cell"
      className="astw:flex astw:min-w-0 astw:items-center astw:gap-2"
    >
      {Array.from({ length: depth }, (_, level) => (
        <span key={level} className={STEP_CLASS} aria-hidden />
      ))}
      {hasSubRows ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={t(expanded ? "collapseRow" : "expandRow", { label })}
          // The row's own click (`onClickRow`) shouldn't fire from the caret.
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
          className={cn(
            STEP_CLASS,
            // Overrides the "not allowed" cursor of a read-only cell in an editable table.
            "astw:cursor-pointer",
            "astw:text-muted-foreground astw:hover:bg-muted astw:flex astw:items-center astw:justify-center astw:rounded",
            "astw:focus-visible:ring-ring/50 astw:focus-visible:ring-2 astw:focus-visible:outline-none",
          )}
        >
          <ChevronRight
            className={cn(
              "astw:size-4 astw:transition-transform astw:duration-200 astw:motion-reduce:transition-none",
              expanded && "astw:rotate-90",
            )}
          />
        </button>
      ) : (
        <span className={STEP_CLASS} aria-hidden />
      )}
      {selection ? (
        <Checkbox
          checked={selection.checked}
          indeterminate={selection.indeterminate}
          disabled={selection.disabled}
          onCheckedChange={selection.onToggle}
          // The row's own click (`onClickRow`) shouldn't fire from the checkbox.
          onClick={(event) => event.stopPropagation()}
          aria-label={t("selectRow")}
        />
      ) : null}
      <span className="astw:min-w-0 astw:flex-1">{children}</span>
    </span>
  );
}

export { SubRowsCellContent };
