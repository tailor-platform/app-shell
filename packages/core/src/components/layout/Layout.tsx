import * as React from "react";
import { cn } from "../../lib/utils";
import type {
  LayoutProps,
  ColumnProps,
  LayoutHeaderProps,
  ColumnArea,
} from "./types";

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
        className={cn(
          "astw:min-w-0 astw:flex astw:flex-col astw:gap-4",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
Column.displayName = "Layout.Column";

// ============================================================================
// HEADER COMPONENT
// ============================================================================

/**
 * Layout.Header - Header for page title and actions.
 *
 * Compose inside Layout above Layout.Column children.
 * Title on the left, actions on the right.
 * Children render full-width below the title/actions row (e.g. tabs).
 */
function LayoutHeader({ title, actions, children }: LayoutHeaderProps) {
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
LayoutHeader.displayName = "Layout.Header";

// ============================================================================
// AREA VALIDATION
// ============================================================================

const VALID_AREAS: ColumnArea[] = ["left", "main", "right"];

function validateAreas(
  columnChildren: React.ReactElement[],
): "position" | "area" {
  const areas = columnChildren.map(
    (child) => (child.props as ColumnProps).area,
  );
  const withArea = areas.filter((a) => a != null);

  if (withArea.length === 0) return "position";
  if (withArea.length !== areas.length) {
    console.warn(
      "Layout: `area` prop must be specified on all Layout.Column children or none. " +
        "Falling back to position-based layout.",
    );
    return "position";
  }

  const uniqueAreas = new Set(withArea);
  if (uniqueAreas.size !== withArea.length) {
    console.warn(
      "Layout: Duplicate `area` values found. Falling back to position-based layout.",
    );
    return "position";
  }

  for (const area of withArea) {
    if (!VALID_AREAS.includes(area!)) {
      console.warn(
        `Layout: Invalid area "${area}". Valid values: "left", "main", "right". ` +
          "Falling back to position-based layout.",
      );
      return "position";
    }
  }

  return "area";
}

// ============================================================================
// AREA-BASED WIDTH CLASSES
// ============================================================================

function getAreaWidthClass(area: ColumnArea, columnCount: number): string {
  const breakpointPrefix = columnCount === 3 ? "astw:xl:" : "astw:lg:";
  switch (area) {
    case "left":
      return `${breakpointPrefix}min-w-[320px]`;
    case "main":
      return `${breakpointPrefix}flex-1`;
    case "right":
      return `${breakpointPrefix}min-w-[280px]`;
  }
}

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
 * // With Layout.Header
 * <Layout>
 *   <Layout.Header title="Page Title" actions={<Button>Save</Button>} />
 *   <Layout.Column>Main content</Layout.Column>
 *   <Layout.Column>Side panel</Layout.Column>
 * </Layout>
 *
 * // With area prop
 * <Layout>
 *   <Layout.Column area="left">Sidebar</Layout.Column>
 *   <Layout.Column area="main">Content</Layout.Column>
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
  // Parse children into header and column children
  const headerChild: React.ReactElement | null = (() => {
    let found: React.ReactElement | null = null;
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.type === LayoutHeader) {
        found = child;
      }
    });
    return found;
  })();

  const columnChildren: React.ReactElement[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === Column) {
      columnChildren.push(child);
    } else if (child.type !== LayoutHeader) {
      console.warn(
        "Layout: Unsupported child type detected. Only Layout.Header and Layout.Column are allowed as children.",
      );
    }
  });

  // Enforce max 3 columns
  if (columnChildren.length > 3) {
    console.warn(
      `Layout: Maximum of 3 Layout.Column children supported. Found ${columnChildren.length}. Only the first 3 will be rendered.`,
    );
  }
  const effectiveColumns = columnChildren.slice(0, 3);

  // Determine column count: explicit prop (deprecated) or auto-detect
  const columnCount = (columns ?? effectiveColumns.length) as 1 | 2 | 3;

  // Determine area mode
  const areaMode = validateAreas(effectiveColumns);

  // Gap mapping: 4 = gap-4 (16px), 6 = gap-6 (24px), 8 = gap-8 (32px)
  const gapClass =
    gap === 4
      ? "astw:gap-4"
      : gap === 6
        ? "astw:gap-6"
        : gap === 8
          ? "astw:gap-8"
          : "astw:gap-4";

  // Build flexbox classes based on column count
  const containerClasses = cn(
    "astw:flex astw:w-full",
    gapClass,
    columnCount === 1 && "astw:flex-col",
    columnCount === 2 && ["astw:flex-col", "astw:lg:flex-row"],
    columnCount === 3 && ["astw:flex-col", "astw:xl:flex-row"],
    className,
  );

  // Apply width constraints to columns
  const childrenWithStyles = React.useMemo(() => {
    if (columnCount === 1) {
      return effectiveColumns;
    }

    if (areaMode === "area") {
      return effectiveColumns.map((child) => {
        const area = (child.props as ColumnProps).area!;
        return React.cloneElement(child, {
          className: cn(
            (child.props as ColumnProps).className,
            getAreaWidthClass(area, columnCount),
          ),
        } as Partial<ColumnProps>);
      });
    }

    // Position-based (default)
    if (columnCount === 2) {
      return effectiveColumns.map((child, index) => {
        return React.cloneElement(child, {
          className: cn(
            (child.props as ColumnProps).className,
            index === 0 ? "astw:lg:flex-1" : "astw:lg:min-w-[280px]",
          ),
        } as Partial<ColumnProps>);
      });
    }

    if (columnCount === 3) {
      return effectiveColumns.map((child, index) => {
        return React.cloneElement(child, {
          className: cn(
            (child.props as ColumnProps).className,
            index === 0
              ? "astw:xl:min-w-[320px]"
              : index === 2
                ? "astw:xl:min-w-[280px]"
                : "astw:xl:flex-1",
          ),
        } as Partial<ColumnProps>);
      });
    }

    return effectiveColumns;
  }, [effectiveColumns, columnCount, areaMode]);

  // Header: prefer Layout.Header child, fall back to title/actions props
  const hasLegacyHeader = title || (actions && actions.length > 0);

  return (
    <div className="astw:flex astw:flex-col">
      {headerChild}
      {!headerChild && hasLegacyHeader && (
        <header
          className="astw:w-full astw:flex astw:justify-between astw:items-center"
          style={{ paddingTop: "1rem", paddingBottom: "1rem" }}
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
      <div
        style={{
          padding:
            headerChild || hasLegacyHeader ? "0 0 1rem 0" : "1rem 0 1rem 0",
        }}
      >
        <div className={containerClasses}>{childrenWithStyles}</div>
      </div>
    </div>
  );
}

// Attach sub-components
Layout.Column = Column;
Layout.Header = LayoutHeader;

// ============================================================================
// EXPORTS
// ============================================================================

export default Layout;
export type { LayoutProps } from "./types";
