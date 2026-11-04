import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import type { LineItemsController } from "./controller";
import { useLineItemsT } from "./i18n";
import type { UseLineItemsReturn } from "./types";

function isAfter(event: DragEvent<HTMLTableRowElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  return event.clientY > rect.top + rect.height / 2;
}

// shortcut: native dragging is desktop-only; add touch sensors if touch reordering is required.
export function useRowReorder<T extends Record<string, unknown>>(
  value: UseLineItemsReturn<T>,
  controller: LineItemsController<T>,
) {
  const t = useLineItemsT();
  const hintId = useId();
  const enabled = value.ordering === "manual" && value.mode !== "view";
  const source = useRef<string | null>(null);
  const focusAfterMove = useRef<string | null>(null);
  const handles = useRef(new Map<string, HTMLButtonElement>());
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ key: string; after: boolean } | null>(null);
  const [announcement, setAnnouncement] = useState("");

  function cancelDrag() {
    source.current = null;
    setDragKey(null);
    setDropTarget(null);
  }

  useLayoutEffect(() => {
    if (!enabled) {
      source.current = null;
      focusAfterMove.current = null;
      setDragKey(null);
      setDropTarget(null);
    }
  }, [enabled]);

  useLayoutEffect(() => {
    const key = focusAfterMove.current;
    focusAfterMove.current = null;
    if (key) handles.current.get(key)?.focus({ preventScroll: true });
  }, [value.allLines]);

  function move(sourceKey: string, targetKey: string, after: boolean) {
    if (!enabled || sourceKey === targetKey) return;
    // Client keys survive server-ID acknowledgment; resolve current public keys only at drop.
    const row = value.lines.find((line) => controller.getClientKey(line) === sourceKey);
    const target = value.lines.find((line) => controller.getClientKey(line) === targetKey);
    if (!row || !target) return;
    const from = value.allLines.indexOf(row);
    const remaining = value.allLines.filter((line) => line !== row);
    const to = remaining.indexOf(target) + (after ? 1 : 0);
    if (from === to) return;
    const previous = remaining[to - 1];
    focusAfterMove.current = sourceKey;
    value.reorderLine(value.getLineKey(row), previous ? value.getLineKey(previous) : null);
    setAnnouncement(t("reorderedRow", { index: from + 1, position: to + 1 }));
  }

  const dropPosition = dropTarget?.after ? "after" : "before";
  return {
    enabled,
    hintId,
    hint: t("reorderKeys"),
    announcement,
    rowProps: (key: string) => ({
      "data-dragging": dragKey === key || undefined,
      "data-drop-position": dropTarget?.key === key ? dropPosition : undefined,
      onDragOver: (event: DragEvent<HTMLTableRowElement>) => {
        if (!enabled || !source.current) return;
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = "move";
        setDropTarget({ key, after: isAfter(event) });
      },
      onDrop: (event: DragEvent<HTMLTableRowElement>) => {
        if (!enabled || !source.current) return;
        event.preventDefault();
        event.stopPropagation();
        try {
          move(source.current, key, isAfter(event));
        } finally {
          cancelDrag();
        }
      },
    }),
    handleProps: (key: string, index: number) => ({
      ref: (node: HTMLButtonElement | null) => {
        if (node) handles.current.set(key, node);
        else handles.current.delete(key);
      },
      type: "button" as const,
      draggable: value.allLines.length > 1,
      disabled: value.allLines.length < 2,
      "aria-label": t("reorderRow", { index: index + 1 }),
      "aria-describedby": hintId,
      title: t("reorderKeys"),
      onDragStart: (event: DragEvent<HTMLButtonElement>) => {
        if (!enabled || value.allLines.length < 2) {
          event.preventDefault();
          return;
        }
        source.current = key;
        setDragKey(key);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", key);
      },
      onDragEnd: cancelDrag,
      onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === "Escape") {
          cancelDrag();
          return;
        }
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
        event.preventDefault();
        event.stopPropagation();
        const visibleIndex = value.lines.findIndex((line) => controller.getClientKey(line) === key);
        const after = event.key === "ArrowDown";
        const target = value.lines[visibleIndex + (after ? 1 : -1)];
        if (target) move(key, controller.getClientKey(target), after);
        cancelDrag();
      },
    }),
  };
}
