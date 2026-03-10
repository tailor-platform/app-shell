import type { LayoutHeaderProps } from "./types";

// ============================================================================
// LAYOUT HEADER
// ============================================================================

/**
 * LayoutHeader - Standalone header for page title and actions.
 *
 * Compose above Layout as a sibling. Title on the left, actions on the right.
 * Children render full-width below the title/actions row (e.g. tabs).
 */
export function LayoutHeader({ title, actions, children }: LayoutHeaderProps) {
  const hasTitleRow = title || (actions != null && actions !== false);

  return (
    <header className="astw:flex astw:w-full astw:flex-col">
      {hasTitleRow && (
        <div className="astw:flex astw:w-full astw:flex-1 astw:items-center astw:justify-between astw:py-4">
          {title && (
            <h1 className="astw:text-2xl astw:font-bold astw:tracking-tight">
              {title}
            </h1>
          )}
          {actions != null && actions !== false && (
            <div className="astw:flex astw:gap-2 astw:items-center">
              {actions}
            </div>
          )}
        </div>
      )}
      {children != null && children !== false && (
        <div className="astw:w-full">{children}</div>
      )}
    </header>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default LayoutHeader;
export type { LayoutHeaderProps } from "./types";
