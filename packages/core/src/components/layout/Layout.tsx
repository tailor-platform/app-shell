import * as React from "react";
import { cn } from "../../lib/utils";
import type { LayoutProps, ColumnProps, LayoutHeaderProps, ColumnArea } from "./types";

/**
 * Layout.Column — A single column within `<Layout>`.
 *
 * Wrap each logical section of the page in a `<Layout.Column>`.
 * The parent `<Layout>` sizes columns via CSS Grid `grid-template-columns`,
 * based on the number of children and, optionally, the `area` prop.
 * Column width is controlled entirely by the parent grid — the column
 * itself does not set its own width.
 *
 * ### Position-based mode (default)
 *
 * When no `area` prop is provided, columns are sized by their DOM position:
 *
 * - **2-column:** 1st = flexible (`1fr`), 2nd = fixed 280 px
 * - **3-column:** 1st = fixed 320 px, 2nd = flexible (`1fr`), 3rd = fixed 280 px
 * - **4+ columns:** all columns share equal width (`repeat(N, 1fr)`)
 *
 * ### Area mode
 *
 * Set the `area` prop on any column to opt into role-based widths.
 * Columns without an `area` prop default to `1fr`.
 * Visual ordering always follows DOM order, so place your columns in the
 * intended left-to-right sequence.
 *
 * | area      | width             |
 * | --------- | ----------------- |
 * | `"left"`  | fixed 320 px      |
 * | `"main"`  | flexible (`1fr`)  |
 * | `"right"` | fixed 280 px      |
 *
 * ### Data attributes
 *
 * The rendered `<div>` always has `data-layout-column`.
 * When `area` is set, `data-area` is also added with the area value.
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
  ({ className, style, children, area, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-layout-column=""
        {...(area ? { "data-area": area } : {})}
        className={cn("astw:min-w-0 astw:flex astw:flex-col astw:gap-4", className)}
        style={style}
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
 * children. The header spans the full width of the grid via `col-span-full`,
 * regardless of column count.
 *
 * If multiple `Layout.Header` children are provided to `<Layout>`, only the
 * first one is rendered.
 *
 * - **title** — Rendered as an `<h1>` on the left side.
 * - **actions** — Rendered on the right side (e.g. save / cancel buttons).
 * - **children** — Rendered full-width below the title/actions row.
 *   Useful for tabs, breadcrumbs, or other secondary navigation.
 *
 * ### Data attributes
 *
 * The rendered `<header>` has `data-layout-header`, which `<Layout>` uses
 * internally to apply `col-span-full`.
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
    <header data-layout-header="" className="astw:flex astw:w-full astw:flex-col">
      {hasTitleRow && (
        <div className="astw:flex astw:w-full astw:flex-1 astw:items-center astw:justify-between astw:pt-4">
          {title && <h1 className="astw:text-2xl astw:font-bold astw:tracking-tight">{title}</h1>}
          {actions != null && actions.length > 0 && (
            <div className="astw:ml-auto astw:flex astw:gap-2 astw:items-center">
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

const AREA_WIDTHS: Record<ColumnArea, string> = {
  left: "320px",
  main: "1fr",
  right: "280px",
};

const POSITION_TEMPLATES: Record<number, string> = {
  2: "1fr 280px",
  3: "320px 1fr 280px",
};

/**
 * Layout – Responsive grid layout component
 *
 * Uses CSS Grid for responsive column layouts. On mobile, all columns
 * stack vertically (`grid-cols-1`). At `lg` (2-column) or `xl` (3+ column)
 * breakpoints, columns display side by side with widths determined by
 * position or the `area` prop on each `Layout.Column`.
 *
 * ### Child filtering
 *
 * Only `Layout.Header` and `Layout.Column` are recognized as children;
 * any other elements are silently ignored and will not be rendered.
 * If multiple `Layout.Header` children are provided, only the first one
 * is rendered.
 *
 * ### Grid template
 *
 * Column widths are controlled via a `--layout-cols` CSS custom property
 * set on the root `<div>`, consumed by `grid-cols-[var(--layout-cols)]`.
 * The value is computed from position (see `Layout.Column`) or `area` props.
 * For a single column, no custom property is set and the grid remains
 * `grid-cols-1`.
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
export function Layout({ columns, className, style, gap, title, actions, children }: LayoutProps) {
  const areas: (ColumnArea | undefined)[] = [];
  let hasHeaderChild = false;

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === Header) {
      hasHeaderChild = true;
    } else if (child.type === Column) {
      areas.push((child.props as ColumnProps).area);
    }
  });

  const columnCount = areas.length;
  const effectiveColumnCount = columns ?? columnCount;

  if (columns !== undefined && columns !== columnCount) {
    console.warn(
      `Layout: \`columns\` prop (${columns}) does not match Layout.Column child count (${columnCount}). ` +
        "The `columns` prop is deprecated; remove it to use auto-detection.",
    );
  }

  const hasAreas = areas.some((a) => a != null);
  let gridTemplate: string | undefined;
  if (effectiveColumnCount >= 2) {
    if (hasAreas) {
      gridTemplate = areas.map((a) => (a ? AREA_WIDTHS[a] : "1fr")).join(" ");
    } else {
      gridTemplate =
        POSITION_TEMPLATES[effectiveColumnCount] ?? `repeat(${effectiveColumnCount}, 1fr)`;
    }
  }

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

  const hasLegacyHeader = !hasHeaderChild && (title || (actions != null && actions.length > 0));

  return (
    <div
      className={cn(
        "astw:grid astw:grid-cols-1 astw:w-full",
        hasHeaderChild || hasLegacyHeader ? "astw:pb-4" : "astw:py-4",
        gapClass,
        "astw:[&>[data-layout-header]]:col-span-full",
        effectiveColumnCount === 2 && gridTemplate && "astw:lg:grid-cols-[var(--layout-cols)]",
        effectiveColumnCount >= 3 && gridTemplate && "astw:xl:grid-cols-[var(--layout-cols)]",
        className,
      )}
      style={
        {
          ...style,
          ...(gridTemplate ? { "--layout-cols": gridTemplate } : undefined),
        } as React.CSSProperties
      }
    >
      {hasLegacyHeader && (
        <header
          data-layout-header=""
          className="astw:w-full astw:flex astw:justify-between astw:items-center astw:pt-4"
        >
          {title && <h1 className="astw:text-2xl astw:font-bold astw:tracking-tight">{title}</h1>}
          {actions != null && actions.length > 0 && (
            <div className="astw:flex astw:gap-2 astw:items-center">
              {actions.map((action, i) => (
                <React.Fragment key={i}>{action}</React.Fragment>
              ))}
            </div>
          )}
        </header>
      )}
      {children}
    </div>
  );
}

// Attach sub-components
Layout.Column = Column;
Layout.Header = Header;

export type { LayoutProps } from "./types";
