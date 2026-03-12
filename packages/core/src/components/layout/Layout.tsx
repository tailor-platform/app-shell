import * as React from "react";
import { cn } from "../../lib/utils";
import type { LayoutProps, ColumnProps, LayoutHeaderProps, ColumnArea } from "./types";

/**
 * Layout.Column — A single column within `<Layout>`.
 *
 * Wrap each logical section of the page in a `<Layout.Column>`.
 * The parent `<Layout>` automatically sizes columns based on the number of
 * children and, optionally, the `area` prop.
 *
 * **Area mode** — Give every column an `area` prop to opt into role-based
 * widths instead of position-based widths:
 *
 * | area     | width          |
 * | -------- | -------------- |
 * | `"left"`  | fixed 320 px   |
 * | `"main"`  | flexible (1fr) |
 * | `"right"` | fixed 280 px   |
 *
 * @example
 * ```tsx
 * // Position-based (default)
 * <Layout>
 *   <Layout.Column>Main content</Layout.Column>
 *   <Layout.Column>Side panel</Layout.Column>
 * </Layout>
 *
 * // Area-based
 * <Layout>
 *   <Layout.Column area="left">Sidebar</Layout.Column>
 *   <Layout.Column area="main">Content</Layout.Column>
 * </Layout>
 * ```
 */
export const Column = React.forwardRef<HTMLDivElement, ColumnProps>(
  ({ className, children, area: _area, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("astw:min-w-0 astw:flex astw:flex-col astw:gap-4", className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
Column.displayName = "Layout.Column";

/**
 * Layout.Header — Page-level header with title, actions, and an optional
 * full-width slot.
 *
 * Place this as a direct child of `<Layout>`, above any `<Layout.Column>`
 * children. The header spans the full width of the layout regardless of
 * column count.
 *
 * - **title** — Rendered as an `<h1>` on the left side.
 * - **actions** — Rendered on the right side (e.g. save / cancel buttons).
 * - **children** — Rendered full-width below the title/actions row.
 *   Useful for tabs, breadcrumbs, or other secondary navigation.
 *
 * @example
 * ```tsx
 * <Layout>
 *   <Layout.Header
 *     title="Purchase Orders"
 *     actions={[<Button key="create">Create</Button>]}
 *   >
 *     <Tabs value={tab} onValueChange={setTab}>
 *       <TabsList>
 *         <TabsTrigger value="all">All</TabsTrigger>
 *         <TabsTrigger value="open">Open</TabsTrigger>
 *       </TabsList>
 *     </Tabs>
 *   </Layout.Header>
 *   <Layout.Column>…</Layout.Column>
 * </Layout>
 * ```
 */
export function Header({ title, actions, children }: LayoutHeaderProps) {
  const hasTitleRow = title || (actions != null && actions.length > 0);

  return (
    <header className="astw:flex astw:w-full astw:flex-col">
      {hasTitleRow && (
        <div className="astw:flex astw:w-full astw:flex-1 astw:items-center astw:justify-between astw:py-4">
          {title && <h1 className="astw:text-2xl astw:font-bold astw:tracking-tight">{title}</h1>}
          {actions != null && actions.length > 0 && (
            <div className="astw:flex astw:gap-2 astw:items-center">
              {actions.map((action, i) => (
                <React.Fragment key={i}>{action}</React.Fragment>
              ))}
            </div>
          )}
        </div>
      )}
      {children != null && children !== false && <div className="astw:w-full">{children}</div>}
    </header>
  );
}
Header.displayName = "Layout.Header";

/**
 * Validates that `area` props on column children are consistent.
 * Returns `"area"` if all columns have valid, unique area values;
 * otherwise falls back to `"position"` mode with a console warning.
 */
const VALID_AREAS: ColumnArea[] = ["left", "main", "right"];

function validateAreas(columnChildren: React.ReactElement[]): "position" | "area" {
  const areas = columnChildren.map((child) => (child.props as ColumnProps).area);
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
    console.warn("Layout: Duplicate `area` values found. Falling back to position-based layout.");
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

/**
 * Returns the Tailwind width class for a given column area and column count.
 * Uses `xl:` breakpoint for 3-column layouts, `lg:` for 2-column.
 */
function getAreaWidthClass(area: ColumnArea, columnCount: number): string {
  if (columnCount === 3) {
    switch (area) {
      case "left":
        return "astw:xl:w-[320px] astw:xl:shrink-0";
      case "main":
        return "astw:xl:flex-1";
      case "right":
        return "astw:xl:w-[280px] astw:xl:shrink-0";
    }
  }
  switch (area) {
    case "left":
      return "astw:lg:w-[320px] astw:lg:shrink-0";
    case "main":
      return "astw:lg:flex-1";
    case "right":
      return "astw:lg:w-[280px] astw:lg:shrink-0";
  }
}

/**
 * Applies responsive width classes to column children based on column count
 * and area/position mode. Returns a new array of cloned elements with the
 * appropriate `className` merged in.
 */
function applyColumnStyles(
  effectiveColumns: React.ReactElement[],
  columnCount: number,
  areaMode: "position" | "area",
): React.ReactElement[] {
  if (columnCount === 1) {
    return effectiveColumns;
  }

  if (areaMode === "area") {
    return effectiveColumns.map((child, index) => {
      const area = (child.props as ColumnProps).area!;
      return React.cloneElement(child, {
        key: child.key ?? index,
        className: cn((child.props as ColumnProps).className, getAreaWidthClass(area, columnCount)),
      } as Partial<ColumnProps>);
    });
  }

  // Position-based (default)
  if (columnCount === 2) {
    return effectiveColumns.map((child, index) => {
      return React.cloneElement(child, {
        key: child.key ?? index,
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
        key: child.key ?? index,
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
}

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
 *   <Layout.Header title="Page Title" actions={[<Button key="save">Save</Button>]} />
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
export function Layout({ columns, className, gap, title, actions, children }: LayoutProps) {
  // Parse children into header and column children
  const headerChild: React.ReactElement | null = (() => {
    let found: React.ReactElement | null = null;
    let headerCount = 0;
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.type === Header) {
        headerCount++;
        if (!found) found = child;
      }
    });
    if (headerCount > 1) {
      console.warn("Layout: Only one Layout.Header is allowed. Extra headers will be ignored.");
    }
    return found;
  })();

  const columnChildren: React.ReactElement[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === Column) {
      columnChildren.push(child);
    } else if (child.type !== Header) {
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

  // Determine column count: explicit prop (deprecated) or auto-detect.
  // May be 0 when no Layout.Column children exist; applyColumnStyles returns []
  // and the inner container renders as an empty flex div.
  const columnCount = columns ?? effectiveColumns.length;

  if (columns !== undefined && columns !== effectiveColumns.length) {
    console.warn(
      `Layout: \`columns\` prop (${columns}) does not match Layout.Column child count (${effectiveColumns.length}). ` +
        "The `columns` prop is deprecated; remove it to use auto-detection.",
    );
  }

  // Determine area mode
  const areaMode = validateAreas(effectiveColumns);

  // Gap mapping: 4 = gap-4 (16px), 6 = gap-6 (24px), 8 = gap-8 (32px)
  const gapClass =
    gap === undefined
      ? "astw:gap-4"
      : gap === 4
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

  // Apply width constraints to columns.
  // No useMemo — the computation is trivial (mapping over at most 3 elements)
  // and `effectiveColumns` is a new array ref every render (from .slice()),
  // which would invalidate any memo anyway.
  const childrenWithStyles = applyColumnStyles(effectiveColumns, columnCount, areaMode);

  // Header: prefer Layout.Header child, fall back to title/actions props
  const hasLegacyHeader = title || (actions != null && actions.length > 0);

  return (
    <div className="astw:flex astw:flex-col">
      {headerChild}
      {!headerChild && hasLegacyHeader && (
        <header
          className="astw:w-full astw:flex astw:justify-between astw:items-center"
          style={{ paddingTop: "1rem", paddingBottom: "1rem" }}
        >
          {title && <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{title}</h1>}
          {actions != null && actions.length > 0 && (
            <div className="astw:flex astw:gap-2 astw:items-center">
              {actions.map((action, i) => (
                <React.Fragment key={i}>{action}</React.Fragment>
              ))}
            </div>
          )}
        </header>
      )}
      <div className={cn(headerChild || hasLegacyHeader ? "astw:pb-4" : "astw:py-4")}>
        <div className={containerClasses}>{childrenWithStyles}</div>
      </div>
    </div>
  );
}

// Attach sub-components
Layout.Column = Column;
Layout.Header = Header;

export default Layout;
export type { LayoutProps } from "./types";
