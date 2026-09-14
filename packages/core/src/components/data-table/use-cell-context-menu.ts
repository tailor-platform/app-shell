import { useCallback, useEffect, useRef, useState, type MouseEvent, type TouchEvent } from "react";
import type { DataTableFilterConfig } from "./types";

const LONG_PRESS_DELAY = 500;
const LONG_PRESS_MOVE_THRESHOLD = 10;

export interface CellContextMenuState {
  anchor: { getBoundingClientRect: () => DOMRect };
  headerLabel: string;
  value: unknown;
  filterConfig?: DataTableFilterConfig;
}

interface CellContextMenuPayload {
  headerLabel: string;
  value: unknown;
  filterConfig?: DataTableFilterConfig;
}

function createContextMenuAnchor(x: number, y: number, size = 0) {
  return {
    getBoundingClientRect() {
      return new DOMRect(x, y, size, size);
    },
  };
}

/**
 * Owns the shared body-cell context menu for `DataTable`.
 *
 * Why this hook exists instead of one `<ContextMenu.Trigger>` per cell:
 * - Base UI's context-menu trigger installs document-level listeners per instance,
 *   so a large table would otherwise mount hundreds of listeners.
 * - The menu content depends on the clicked cell's raw value, but that value only
 *   matters when the menu opens; resolving it lazily avoids per-cell work on every render.
 * - Touch support needs a long-press gesture with movement cancellation, which is
 *   easier to keep correct in one place than in every cell render path.
 * - Close animation needs the last anchor point to stay alive until the popup has
 *   fully exited; we therefore track `open` separately from the stored context.
 */
export function useCellContextMenu() {
  const [contextMenu, setContextMenu] = useState<CellContextMenuState | null>(null);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const touchPositionRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLongPress = useCallback(() => {
    if (longPressTimeoutRef.current != null) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    touchPositionRef.current = null;
  }, []);

  useEffect(() => () => clearLongPress(), [clearLongPress]);

  const openContextMenu = useCallback(
    (x: number, y: number, payload: CellContextMenuPayload, touchTargetSize = 0) => {
      clearLongPress();
      setContextMenu({
        anchor: createContextMenuAnchor(x, y, touchTargetSize),
        ...payload,
      });
      setContextMenuOpen(true);
    },
    [clearLongPress],
  );

  const handleContextMenuOpenChange = useCallback((open: boolean) => {
    setContextMenuOpen(open);
  }, []);

  const handleContextMenuCloseComplete = useCallback(() => {
    setContextMenu(null);
  }, []);

  const getCellContextMenuHandlers = useCallback(
    (payload: CellContextMenuPayload) => ({
      onContextMenu: (event: MouseEvent) => {
        event.preventDefault();
        openContextMenu(event.clientX, event.clientY, payload);
      },
      onTouchStart: (event: TouchEvent) => {
        if (event.touches.length !== 1) return;
        event.stopPropagation();
        const touch = event.touches[0];
        clearLongPress();
        touchPositionRef.current = { x: touch.clientX, y: touch.clientY };
        longPressTimeoutRef.current = setTimeout(() => {
          const point = touchPositionRef.current;
          if (!point) return;
          openContextMenu(point.x, point.y, payload, 10);
        }, LONG_PRESS_DELAY);
      },
      onTouchMove: (event: TouchEvent) => {
        const point = touchPositionRef.current;
        if (!point || event.touches.length !== 1) return;
        const touch = event.touches[0];
        if (
          Math.abs(touch.clientX - point.x) > LONG_PRESS_MOVE_THRESHOLD ||
          Math.abs(touch.clientY - point.y) > LONG_PRESS_MOVE_THRESHOLD
        ) {
          clearLongPress();
        }
      },
      onTouchEnd: clearLongPress,
      onTouchCancel: clearLongPress,
    }),
    [clearLongPress, openContextMenu],
  );

  return {
    contextMenu,
    contextMenuOpen,
    handleContextMenuOpenChange,
    handleContextMenuCloseComplete,
    getCellContextMenuHandlers,
  };
}
