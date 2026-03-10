import * as React from "react";
import { cn } from "../../lib/utils";
import type {
  LayoutProps,
  LayoutLeftProps,
  LayoutMainProps,
  LayoutRightProps,
} from "./types";

// ============================================================================
// BREAKPOINT HOOK
// ============================================================================

const LG_BREAKPOINT = 1024;
const XL_BREAKPOINT = 1280;

function useMinWidth(breakpoint: number): boolean {
  const [matches, setMatches] = React.useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth >= breakpoint;
  });

  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${breakpoint}px)`);
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    setMatches(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);

  return matches;
}

// ============================================================================
// SLOT COMPONENTS
// ============================================================================

function LayoutLeft({ children }: LayoutLeftProps) {
  return <>{children}</>;
}
LayoutLeft.displayName = "Layout.Left";

function LayoutMain({ children }: LayoutMainProps) {
  return <>{children}</>;
}
LayoutMain.displayName = "Layout.Main";

function LayoutRight({ children }: LayoutRightProps) {
  return <>{children}</>;
}
LayoutRight.displayName = "Layout.Right";

// ============================================================================
// SLOT PARSING
// ============================================================================

interface SlotData {
  content: React.ReactNode;
  className?: string;
}

function parseSlots(children: React.ReactNode): {
  left?: SlotData;
  main?: SlotData;
  right?: SlotData;
} {
  const result: {
    left?: SlotData;
    main?: SlotData;
    right?: SlotData;
  } = {};
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const props = child.props as {
      children?: React.ReactNode;
      className?: string;
    };
    if (child.type === LayoutLeft) {
      result.left = { content: props.children, className: props.className };
    }
    if (child.type === LayoutMain) {
      result.main = { content: props.children, className: props.className };
    }
    if (child.type === LayoutRight) {
      result.right = { content: props.children, className: props.className };
    }
  });
  return result;
}

// ============================================================================
// LAYOUT COMPONENT
// ============================================================================

type LayoutMode = "contentOnly" | "twoColLeft" | "twoColRight" | "threeCol";

const COL_BASE: React.CSSProperties = {
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
};

const MAIN_COL_STYLE: React.CSSProperties = {
  ...COL_BASE,
  flex: "1 1 0%",
};

function getModeFromSlots(slots: ReturnType<typeof parseSlots>): LayoutMode | null {
  const hasLeft = slots.left != null;
  const hasMain = slots.main != null;
  const hasRight = slots.right != null;
  if (hasLeft && hasMain && hasRight) return "threeCol";
  if (hasLeft && hasMain) return "twoColLeft";
  if (hasMain && hasRight) return "twoColRight";
  if (hasMain || hasLeft || hasRight) return "contentOnly";
  return null;
}

/**
 * Layout - Composition-only responsive column layout.
 *
 * Uses `Layout.Left`, `Layout.Main`, and `Layout.Right` as children.
 * Side column dimensions via `className` on each slot (default 320px).
 *
 * @example
 * ```tsx
 * <Layout>
 *   <Layout.Left className="w-[280px]">
 *     <Sidebar />
 *   </Layout.Left>
 *   <Layout.Main>
 *     <Content />
 *   </Layout.Main>
 *   <Layout.Right className="w-[360px] max-w-[400px]">
 *     <Panel />
 *   </Layout.Right>
 * </Layout>
 * ```
 */
export function Layout({
  children,
  className,
}: React.PropsWithChildren<LayoutProps>) {
  const slots = parseSlots(children);
  const mode = getModeFromSlots(slots);

  const breakpoint = mode === "threeCol" ? XL_BREAKPOINT : LG_BREAKPOINT;
  const isRow = useMinWidth(breakpoint);

  if (mode === null) return null;

  const stacked = mode === "contentOnly" || !isRow;

  const containerStyle: React.CSSProperties = {
    display: "flex",
    width: "100%",
    flexDirection: stacked ? "column" : "row",
  };

  const columns: {
    content: React.ReactNode;
    key: string;
    className?: string;
    isSideCol: boolean;
  }[] = [];

  if (mode === "contentOnly") {
    const slot = slots.main ?? slots.left ?? slots.right;
    if (slot != null) {
      columns.push({ content: slot.content, key: "main", className: slot.className, isSideCol: false });
    }
  } else if (mode === "twoColLeft") {
    columns.push(
      { content: slots.left!.content, key: "columnLeft", className: slots.left?.className, isSideCol: true },
      { content: slots.main!.content, key: "main", className: slots.main?.className, isSideCol: false },
    );
  } else if (mode === "twoColRight") {
    columns.push(
      { content: slots.main!.content, key: "main", className: slots.main?.className, isSideCol: false },
      { content: slots.right!.content, key: "columnRight", className: slots.right?.className, isSideCol: true },
    );
  } else if (mode === "threeCol") {
    columns.push(
      { content: slots.left!.content, key: "columnLeft", className: slots.left?.className, isSideCol: true },
      { content: slots.main!.content, key: "main", className: slots.main?.className, isSideCol: false },
      { content: slots.right!.content, key: "columnRight", className: slots.right?.className, isSideCol: true },
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div className={cn("astw:gap-4", className)} style={containerStyle}>
        {columns.map((col) => (
          <div
            key={col.key}
            className={cn(!stacked && col.isSideCol && "astw:w-[320px] astw:shrink-0", col.className)}
            style={col.isSideCol && !stacked ? COL_BASE : MAIN_COL_STYLE}
          >
            {col.content}
          </div>
        ))}
      </div>
    </div>
  );
}

Layout.Left = LayoutLeft;
Layout.Main = LayoutMain;
Layout.Right = LayoutRight;

export default Layout;
export type { LayoutProps } from "./types";
