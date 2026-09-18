import * as React from "react";

import { cn } from "@/lib/utils";
import { Separator as BaseSeparator } from "./separator";

type ToolbarItemOptions = {
  /** Leave Arrow/Home/End handling to a composite control such as Tabs or Select. */
  handlesDirectionalKeys?: boolean;
};

type ToolbarItemContextValue = {
  registerItem: (element: HTMLElement, options: ToolbarItemOptions) => void;
  unregisterItem: (element: HTMLElement) => void;
  updateItem: (element: HTMLElement, options: ToolbarItemOptions) => void;
};

const ToolbarItemContext = React.createContext<ToolbarItemContextValue | null>(null);
const useIsomorphicLayoutEffect =
  typeof document === "undefined" ? React.useEffect : React.useLayoutEffect;

export function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (element: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(element);
      else if (ref) (ref as React.MutableRefObject<T | null>).current = element;
    }
  };
}

/**
 * Registers an AppShell control with its containing `Toolbar.Row`, when any.
 * This is internal plumbing: consumers place Button/Input/Select/etc. directly.
 */
export function useToolbarItem<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  options: ToolbarItemOptions = {},
) {
  const toolbar = React.useContext(ToolbarItemContext);
  const { handlesDirectionalKeys = false } = options;

  useIsomorphicLayoutEffect(() => {
    const element = ref.current;
    if (!toolbar || !element) return;

    toolbar.registerItem(element, { handlesDirectionalKeys });
    return () => toolbar.unregisterItem(element);
  }, [toolbar, ref]);

  useIsomorphicLayoutEffect(() => {
    const element = ref.current;
    if (toolbar && element) toolbar.updateItem(element, { handlesDirectionalKeys });
  }, [toolbar, ref, handlesDirectionalKeys]);
}

function isFocusable(element: HTMLElement) {
  return (
    element.isConnected &&
    element.tabIndex >= 0 &&
    !element.matches(":disabled") &&
    element.getAttribute("aria-disabled") !== "true"
  );
}

export type ToolbarProps = React.ComponentProps<"div">;

/** A full-width visual container for one or more rows of related controls. */
function Root({ className, ...props }: ToolbarProps) {
  return (
    <div
      data-slot="toolbar"
      className={cn(
        "astw:flex astw:w-full astw:flex-col astw:gap-2 astw:rounded-md astw:border astw:border-border astw:bg-card astw:p-2",
        className,
      )}
      {...props}
    />
  );
}
Root.displayName = "Toolbar.Root";

type ToolbarRowProps = Omit<React.ComponentProps<"div">, "role" | "onKeyDown"> & {
  /** Distribute the row's outer groups between its two edges. */
  justify?: "start" | "between";
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
};

/** One independently navigable horizontal row of toolbar controls. */
function Row({
  className,
  justify = "start",
  onKeyDown,
  ref: forwardedRef,
  ...props
}: ToolbarRowProps) {
  const rowRef = React.useRef<HTMLDivElement>(null);
  const items = React.useRef(new Map<HTMLElement, ToolbarItemOptions>());
  const registerItem = React.useCallback((element: HTMLElement, options: ToolbarItemOptions) => {
    items.current.set(element, options);
  }, []);
  const unregisterItem = React.useCallback((element: HTMLElement) => {
    items.current.delete(element);
  }, []);
  const updateItem = React.useCallback((element: HTMLElement, options: ToolbarItemOptions) => {
    if (items.current.has(element)) items.current.set(element, options);
  }, []);
  const toolbar = React.useMemo(
    () => ({ registerItem, unregisterItem, updateItem }),
    [registerItem, unregisterItem, updateItem],
  );

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }

    // Context crosses React portals, but popup controls outside this row are
    // never toolbar items.
    const controls = Array.from(items.current)
      .filter(([element]) => rowRef.current?.contains(element) && isFocusable(element))
      .toSorted(([a], [b]) => {
        const position = a.compareDocumentPosition(b);
        return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      });
    const currentIndex = controls.findIndex(([element]) => element === document.activeElement);
    if (currentIndex === -1 || controls[currentIndex][1].handlesDirectionalKeys) return;

    let nextIndex = currentIndex;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = controls.length - 1;
    if (event.key === "ArrowLeft")
      nextIndex = (currentIndex - 1 + controls.length) % controls.length;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % controls.length;

    event.preventDefault();
    controls[nextIndex]?.[0].focus();
  };

  return (
    <ToolbarItemContext.Provider value={toolbar}>
      <div
        ref={mergeRefs(rowRef, forwardedRef)}
        data-slot="toolbar-row"
        role="toolbar"
        tabIndex={-1}
        aria-orientation="horizontal"
        className={cn(
          "astw:flex astw:min-w-0 astw:flex-wrap astw:items-center astw:gap-2",
          justify === "between" && "astw:justify-between",
          className,
        )}
        onKeyDown={handleKeyDown}
        {...props}
      />
    </ToolbarItemContext.Provider>
  );
}
Row.displayName = "Toolbar.Row";

type ToolbarGroupProps = React.ComponentProps<"div">;

/** A related group of controls within a toolbar row. */
function Group({ className, ...props }: ToolbarGroupProps) {
  return (
    <div
      data-slot="toolbar-group"
      className={cn(
        "astw:flex astw:min-w-0 astw:flex-wrap astw:items-center astw:gap-1.5",
        className,
      )}
      {...props}
    />
  );
}
Group.displayName = "Toolbar.Group";

type ToolbarSeparatorProps = Omit<React.ComponentProps<"div">, "role" | "aria-orientation">;

/** A vertical separator for groups within a horizontal toolbar row. */
function Separator({ className, ...props }: ToolbarSeparatorProps) {
  return (
    <BaseSeparator
      data-slot="toolbar-separator"
      decorative={false}
      orientation="vertical"
      className={cn("astw:h-6", className)}
      {...props}
    />
  );
}
Separator.displayName = "Toolbar.Separator";

export const Toolbar = {
  Root,
  Row,
  Group,
  Separator,
};
