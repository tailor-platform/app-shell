import * as React from "react";
import { cn } from "../../lib/utils";
import type { LayoutProps, ColumnProps } from "./types";

// ============================================================================
// COLUMN COMPONENT
// ============================================================================

/**
 * Individual column component - wraps content for a single column
 */
export const Column = React.forwardRef<HTMLDivElement, ColumnProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("astw:min-w-0 astw:flex astw:flex-col astw:gap-4", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Column.displayName = "Layout.Column";

// ============================================================================
// MAIN LAYOUT COMPONENT
// ============================================================================

/**
 * Layout - Responsive column layout component
 *
 * Automatically handles responsive behavior for 1, 2, or 3 column layouts.
 * Uses flexbox with viewport breakpoints for simple, CSS-only responsive behavior.
 *
 * @example
 * ```tsx
 * // Basic layout
 * <Layout columns={2}>
 *   <Layout.Column>Main content</Layout.Column>
 *   <Layout.Column>Side panel</Layout.Column>
 * </Layout>
 *
 * // With header and actions
 * <Layout columns={2} title="Page Title" actions={[<Button key="save">Save</Button>]}>
 *   <Layout.Column>...</Layout.Column>
 *   <Layout.Column>...</Layout.Column>
 * </Layout>
 * ```
 */
export function Layout({
  columns,
  className,
  gap = 4,
  title,
  actions,
  children,
}: LayoutProps) {
  // Validate that the number of Layout.Column children matches the columns prop
  if (process.env.NODE_ENV !== "production") {
    const childArray = React.Children.toArray(children);
    const columnCount = childArray.reduce<number>((count, child) => {
      return React.isValidElement(child) && child.type === Column
        ? count + 1
        : count;
    }, 0);

    if (columnCount !== columns) {
      throw new Error(
        `Layout: Expected exactly ${columns} Layout.Column child${columns === 1 ? "" : "ren"}, but found ${columnCount}. ` +
        `Please ensure the number of <Layout.Column> children matches the \`columns={${columns}}\` prop.`
      );
    }
  }

  // Gap mapping: 4 = gap-4 (16px), 6 = gap-6 (24px), 8 = gap-8 (32px)
  const gapClass =
    gap === 4
      ? "astw:gap-4"
      : gap === 6
      ? "astw:gap-6"
      : gap === 8
      ? "astw:gap-8"
      : "astw:gap-4"; // default to 4 (16px)

  // Build flexbox classes based on column count
  // Similar to omakase's approach: simple flexbox with viewport breakpoints
  const containerClasses = cn(
    "astw:flex astw:w-full",
    gapClass,
    // 1 column: Always stack vertically
    columns === 1 && "astw:flex-col",
    // 2 columns: Stack on mobile, side-by-side on desktop (lg: ≥1024px)
    // Main column flexible, side column fixed 360px
    columns === 2 && [
      "astw:flex-col",
      "astw:lg:flex-row",
    ],
    // 3 columns: Stack on mobile, 3 columns side-by-side on desktop (xl: ≥1280px)
    // Outer columns fixed 360px, middle column flexible
    columns === 3 && [
      "astw:flex-col",
      "astw:xl:flex-row",
    ],
    className
  );

  // Apply width constraints to columns
  const childrenWithStyles = React.useMemo(() => {
    if (columns === 1) {
      // 1 column: All columns take full width
      return React.Children.map(children, (child) => child);
    } else if (columns === 2) {
      // 2 columns: First column flexible, second column fixed 360px
      return React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child, {
          className: cn(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- React child props type is not known
            (child.props as any).className,
            index === 0
              ? "astw:lg:flex-1" // First column: flexible
              : "astw:lg:min-w-[280px]" // Second column: fixed 280px
          ),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- React.cloneElement requires type assertion
        } as any);
      });
    } else if (columns === 3) {
      // 3 columns: First fixed 320px, middle flexible, third fixed 280px
      return React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child, {
          className: cn(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- React child props type is not known
            (child.props as any).className,
            index === 0
              ? "astw:xl:min-w-[320px]" // First column: fixed 320px
              : index === 2
              ? "astw:xl:min-w-[280px]" // Third column: fixed 280px
              : "astw:xl:flex-1" // Middle column: flexible
          ),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- React.cloneElement requires type assertion
        } as any);
      });
    }
    return children;
  }, [children, columns]);

  const hasHeader = title || (actions && actions.length > 0);

  return (
    <div className="astw:flex astw:flex-col">
      {hasHeader && (
        <header
          className="astw:w-full astw:flex astw:justify-between astw:items-center"
          style={{ padding: "1.5rem", paddingBottom: "1rem" }}
        >
          {title && (
            <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{title}</h1>
          )}
          {actions && actions.length > 0 && (
            <div className="astw:flex astw:gap-2 astw:items-center">
              {actions.map((action, index) => (
                <React.Fragment key={index}>{action}</React.Fragment>
              ))}
            </div>
          )}
        </header>
      )}
      <div style={{ padding: hasHeader ? "0 1.5rem 1.5rem 1.5rem" : "1.5rem" }}>
        <div className={containerClasses}>
          {childrenWithStyles}
        </div>
      </div>
    </div>
  );
}

// Attach Column as a sub-component
Layout.Column = Column;

// ============================================================================
// EXPORTS
// ============================================================================

export default Layout;
export type { LayoutProps } from "./types";
