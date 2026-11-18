import { useLayoutEffect, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import type { UseLineItemsReturn } from "./types";
import { clientKeyOf } from "./document/identity";

function isAfter(event: DragEvent<HTMLTableRowElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  return event.clientY > rect.top + rect.height / 2;
}

/** @internal Drag and keyboard reordering for the current line-items document. */
export function useLineItemsReorder<T extends Record<string, unknown>>(
  value: UseLineItemsReturn<T>,
) {
  const { orderer, lines } = value;
  const [drag, setDrag] = useState<{ clientKey: string; handle: HTMLButtonElement } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ clientKey: string; after: boolean } | null>(null);
  const movedHandle = useRef<HTMLButtonElement | null>(null);
  const resetDrag = () => {
    setDrag(null);
    setDropTarget(null);
  };
  useLayoutEffect(() => {
    if (
      !orderer ||
      (drag &&
        (!drag.handle.isConnected || !lines.some((line) => clientKeyOf(line) === drag.clientKey)))
    ) {
      setDrag(null);
      setDropTarget(null);
    }
  }, [orderer, lines, drag]);
  useLayoutEffect(() => {
    // Moving a keyed table row can blur its handle in the browser.
    movedHandle.current?.focus({ preventScroll: true });
    movedHandle.current = null;
  }, [value.lines]);

  const moveLine = (index: number, destination: number, handle: HTMLButtonElement) => {
    if (
      !value.orderer ||
      index < 0 ||
      destination < 0 ||
      destination >= value.lines.length ||
      index === destination
    )
      return;
    const anchor = value.lines[destination > index ? destination : destination - 1];
    movedHandle.current = handle;
    value.reorderLine(
      value.getLineKey(value.lines[index]),
      anchor ? value.getLineKey(anchor) : null,
    );
  };
  const dropPosition = dropTarget?.after ? "after" : "before";

  return {
    bodyProps: {
      onDragLeave: (event: DragEvent<HTMLTableSectionElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(null);
      },
    },
    getRowProps(index: number) {
      const clientKey = clientKeyOf(value.lines[index]);
      return {
        "data-dragging": value.orderer && drag?.clientKey === clientKey ? "" : undefined,
        "data-drop-position":
          value.orderer && drag && dropTarget?.clientKey === clientKey ? dropPosition : undefined,
        onDragOver: (event: DragEvent<HTMLTableRowElement>) => {
          if (!value.orderer || !drag) return;
          event.preventDefault();
          event.stopPropagation();
          event.dataTransfer.dropEffect = "move";
          const after = isAfter(event);
          setDropTarget((previous) =>
            previous?.clientKey === clientKey && previous.after === after
              ? previous
              : { clientKey, after },
          );
        },
        onDrop: (event: DragEvent<HTMLTableRowElement>) => {
          if (!value.orderer || !drag) return;
          event.preventDefault();
          event.stopPropagation();
          const from = value.lines.findIndex((line) => clientKeyOf(line) === drag.clientKey);
          const gap = index + (isAfter(event) ? 1 : 0);
          moveLine(from, gap > from ? gap - 1 : gap, drag.handle);
          resetDrag();
        },
      };
    },
    getHandleProps(index: number) {
      const clientKey = clientKeyOf(value.lines[index]);
      return {
        "aria-disabled": !value.orderer || value.lines.length < 2,
        draggable: value.orderer && value.lines.length > 1,
        onDragStart: (event: DragEvent<HTMLButtonElement>) => {
          event.stopPropagation();
          if (!value.orderer || value.lines.length < 2) {
            event.preventDefault();
            return;
          }
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", "");
          setDropTarget(null);
          setDrag({ clientKey, handle: event.currentTarget });
        },
        onDragEnd: resetDrag,
        onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            moveLine(index, index + (event.key === "ArrowUp" ? -1 : 1), event.currentTarget);
          }
        },
      };
    },
  };
}
