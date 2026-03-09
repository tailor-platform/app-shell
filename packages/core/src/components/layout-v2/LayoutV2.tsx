import * as React from "react";
import { cn } from "../../lib/utils";
import type { LayoutV2Props } from "./types";

// ============================================================================
// LAYOUT V2
// ============================================================================

type LayoutV2Mode = "mainOnly" | "twoColLeft" | "twoColRight" | "threeCol";

const columnWrapperBaseClasses =
  "astw:min-w-0 astw:flex astw:flex-col astw:gap-4";

// Side column dimensions apply only at row breakpoint (lg/xl); when stacked, columns use full width.
// CSS variables are set on each column div so user overrides work responsively.
const LAYOUT_V2_SIDE_COL_STYLES = `
  .layout-v2-side-col-lg { width: 100%; }
  @media (min-width: 1024px) {
    .layout-v2-side-col-lg {
      width: var(--layout-v2-col-w, 320px);
      min-width: var(--layout-v2-col-min-w);
      max-width: var(--layout-v2-col-max-w);
      flex-shrink: 0;
    }
  }
  .layout-v2-side-col-xl { width: 100%; }
  @media (min-width: 1280px) {
    .layout-v2-side-col-xl {
      width: var(--layout-v2-col-w, 320px);
      min-width: var(--layout-v2-col-min-w);
      max-width: var(--layout-v2-col-max-w);
      flex-shrink: 0;
    }
  }
`;

function getMode(props: LayoutV2Props): LayoutV2Mode | null {
  const { main, columnLeft, columnRight } = props;
  if (main && columnLeft && columnRight) return "threeCol";
  if (main && columnLeft) return "twoColLeft";
  if (main && columnRight) return "twoColRight";
  if (main) return "mainOnly";
  if (columnLeft || columnRight) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "LayoutV2: main is required when columnLeft or columnRight is used. Rendering single column with available content.",
      );
    }
    return columnLeft ? "mainOnly" : "mainOnly"; // treat as mainOnly and render the single slot we have
  }
  return null;
}

/**
 * LayoutV2 - Slot-based responsive column layout.
 *
 * Pass main, columnLeft, and/or columnRight to get 1-, 2-, or 3-column layouts.
 * Default widths: columnLeft and columnRight 320px, main flex. Override with
 * columnLeftWidth/MinWidth/MaxWidth, columnRightWidth/MinWidth/MaxWidth, mainWidth/MinWidth/MaxWidth.
 *
 * @example
 * ```tsx
 * <LayoutV2 main={<Content />} />
 * <LayoutV2 columnLeft={<Sidebar />} main={<Content />} />
 * <LayoutV2 main={<Content />} columnRight={<Actions />} />
 * <LayoutV2 columnLeft={<Nav />} main={<Content />} columnRight={<Aside />} />
 * ```
 */
export function LayoutV2({
  main,
  columnLeft,
  columnRight,
  className,
  gap,
  columnLeftWidth,
  columnLeftMinWidth,
  columnLeftMaxWidth,
  columnRightWidth,
  columnRightMinWidth,
  columnRightMaxWidth,
  mainWidth,
  mainMinWidth,
  mainMaxWidth,
}: LayoutV2Props) {
  const mode = getMode({
    main,
    columnLeft,
    columnRight,
    className,
    gap,
    columnLeftWidth,
    columnLeftMinWidth,
    columnLeftMaxWidth,
    columnRightWidth,
    columnRightMinWidth,
    columnRightMaxWidth,
    mainWidth,
    mainMinWidth,
    mainMaxWidth,
  });

  if (mode === null) return null;

  const gapValue = gap ?? "16px";

  const containerClasses = cn(
    "astw:flex astw:w-full",
    mode === "mainOnly" && "astw:flex-col",
    (mode === "twoColLeft" || mode === "twoColRight") && ["astw:flex-col", "astw:lg:flex-row"],
    mode === "threeCol" && ["astw:flex-col", "astw:xl:flex-row"],
    className,
  );

  const defaultSideWidth = "320px";

  /** Main column: flex by default; or inline styles when user overrides. Applied at all viewports. */
  const buildMainStyle = (
    width?: string,
    minWidth?: string,
    maxWidth?: string,
  ): React.CSSProperties => {
    if (!width && !minWidth && !maxWidth) return { flexGrow: 1, flexShrink: 1 };
    return {
      ...(width && { width }),
      ...(minWidth && { minWidth }),
      ...(maxWidth && { maxWidth }),
    };
  };

  /** Side columns: CSS vars for responsive use (full width when stacked, fixed at lg/xl). */
  const buildSideColumnStyle = (
    width?: string,
    minWidth?: string,
    maxWidth?: string,
    defaultWidth?: string,
  ): React.CSSProperties => {
    const w = width ?? defaultWidth;
    return {
      ...(w && { ["--layout-v2-col-w" as string]: w }),
      ...(minWidth && { ["--layout-v2-col-min-w" as string]: minWidth }),
      ...(maxWidth && { ["--layout-v2-col-max-w" as string]: maxWidth }),
    };
  };

  const sideColClassAtBreakpoint =
    mode === "threeCol" ? "layout-v2-side-col-xl" : "layout-v2-side-col-lg";

  const columns: {
    content: React.ReactNode;
    style: React.CSSProperties;
    key: string;
    sideColClass?: string;
  }[] = [];

  if (mode === "mainOnly") {
    const content = main ?? columnLeft ?? columnRight;
    if (content) {
      columns.push({
        content,
        style: {},
        key: "main",
      });
    }
  } else if (mode === "twoColLeft") {
    columns.push(
      {
        content: columnLeft,
        style: buildSideColumnStyle(
          columnLeftWidth,
          columnLeftMinWidth,
          columnLeftMaxWidth,
          defaultSideWidth,
        ),
        key: "columnLeft",
        sideColClass: sideColClassAtBreakpoint,
      },
      {
        content: main,
        style: buildMainStyle(mainWidth, mainMinWidth, mainMaxWidth),
        key: "main",
      },
    );
  } else if (mode === "twoColRight") {
    columns.push(
      {
        content: main,
        style: buildMainStyle(mainWidth, mainMinWidth, mainMaxWidth),
        key: "main",
      },
      {
        content: columnRight,
        style: buildSideColumnStyle(
          columnRightWidth,
          columnRightMinWidth,
          columnRightMaxWidth,
          defaultSideWidth,
        ),
        key: "columnRight",
        sideColClass: sideColClassAtBreakpoint,
      },
    );
  } else if (mode === "threeCol") {
    columns.push(
      {
        content: columnLeft,
        style: buildSideColumnStyle(
          columnLeftWidth,
          columnLeftMinWidth,
          columnLeftMaxWidth,
          defaultSideWidth,
        ),
        key: "columnLeft",
        sideColClass: sideColClassAtBreakpoint,
      },
      {
        content: main,
        style: buildMainStyle(mainWidth, mainMinWidth, mainMaxWidth),
        key: "main",
      },
      {
        content: columnRight,
        style: buildSideColumnStyle(
          columnRightWidth,
          columnRightMinWidth,
          columnRightMaxWidth,
          defaultSideWidth,
        ),
        key: "columnRight",
        sideColClass: sideColClassAtBreakpoint,
      },
    );
  }

  const isSideColumn = (key: string) => key === "columnLeft" || key === "columnRight";
  const responsiveWidthClass = (key: string) => {
    if (mode === "mainOnly") return "astw:w-full";
    if (mode === "twoColLeft" || mode === "twoColRight") {
      return isSideColumn(key) ? "" : "astw:lg:flex-1";
    }
    return isSideColumn(key) ? "" : "astw:xl:flex-1";
  };

  return (
    <div className="astw:flex astw:flex-col">
      <style dangerouslySetInnerHTML={{ __html: LAYOUT_V2_SIDE_COL_STYLES }} />
      <div style={{ padding: "1rem 0" }}>
        <div className={containerClasses} style={{ gap: gapValue }}>
          {columns.map((col) => (
            <div
              key={col.key}
              className={cn(
                columnWrapperBaseClasses,
                responsiveWidthClass(col.key),
                col.sideColClass,
              )}
              style={col.style}
            >
              {col.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default LayoutV2;
export type { LayoutV2Props } from "./types";
