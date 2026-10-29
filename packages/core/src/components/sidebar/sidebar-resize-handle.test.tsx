import { useCallback, useRef, useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getSidebarDragWidth, SidebarResizeHandle } from "./sidebar-resize-handle";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function ResizableSidebar({
  side = "left",
  collapsed = false,
  onOpenChange,
  onWidthCommit,
}: {
  side?: "left" | "right";
  collapsed?: boolean;
  onOpenChange?: (open: boolean) => void;
  onWidthCommit: (width: number) => void;
}) {
  const [width, setWidth] = useState(256);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const commitWidth = useCallback(
    (next: number) => {
      onWidthCommit(next);
      setWidth(next);
    },
    [onWidthCommit],
  );
  return (
    <div ref={sidebarRef} data-testid="resize-root">
      <output data-testid="committed-width">{width}</output>
      <SidebarResizeHandle
        width={width}
        onWidthChange={commitWidth}
        sidebarRef={sidebarRef}
        side={side}
        collapsed={collapsed}
        onOpenChange={onOpenChange}
      />
    </div>
  );
}

const pointer = { pointerId: 1, isPrimary: true, button: 0 };
const renderHandle = (side: "left" | "right" = "left", collapsed = false, collapsedWidth = 0) => {
  const onOpenChange = vi.fn();
  const onWidthCommit = vi.fn();
  const view = render(
    <ResizableSidebar
      side={side}
      collapsed={collapsed}
      onOpenChange={onOpenChange}
      onWidthCommit={onWidthCommit}
    />,
  );
  vi.spyOn(
    view.container.querySelector('[data-slot="sidebar-collapsed-size"]')!,
    "getBoundingClientRect",
  ).mockReturnValue(new DOMRect(0, 0, collapsedWidth, 0));
  const handle = collapsed
    ? screen.getByRole("button", { name: "Expand sidebar" })
    : screen.getByRole("separator", { name: "Resize sidebar" });
  const capture = vi.fn();
  Object.defineProperty(handle, "setPointerCapture", { value: capture });
  const root = screen.getByTestId("resize-root");
  return { handle, root, capture, onOpenChange, onWidthCommit, unmount: view.unmount };
};

const width = (handle: HTMLElement) => Number(handle.getAttribute("aria-valuenow"));

describe("getSidebarDragWidth", () => {
  it.each([
    { collapsed: true, expected: [64, 72, 80, 88, 192] },
    { collapsed: false, expected: [64, 168, 176, 184, 192] },
  ])(
    "resists toward the current rail mode ($collapsed) and meets both boundaries",
    ({ collapsed, expected }) => {
      expect(
        [64, 96, 128, 160, 192].map((position) => getSidebarDragWidth(position, 64, collapsed)),
      ).toEqual(expected);
    },
  );

  it.each([true, false])(
    "stays continuous at 192px, follows the pointer, and clamps its bounds (%s)",
    (collapsed) => {
      expect(getSidebarDragWidth(191.999, 64, collapsed)).toBeCloseTo(192, 2);
      expect(getSidebarDragWidth(192.001, 64, collapsed)).toBeCloseTo(192, 2);
      expect(getSidebarDragWidth(300, 64, collapsed)).toBe(300);
      expect(getSidebarDragWidth(1000, 64, collapsed)).toBe(480);
      expect(getSidebarDragWidth(-100, 64, collapsed)).toBe(64);
    },
  );

  it.each([
    { collapsed: true, from: 96, to: 106 },
    { collapsed: false, from: 160, to: 150 },
  ])(
    "moves only a quarter of the pointer distance inside the resistance zone ($collapsed)",
    ({ collapsed, from, to }) => {
      const movement =
        getSidebarDragWidth(to, 64, collapsed) - getSidebarDragWidth(from, 64, collapsed);
      expect(movement).toBe((to - from) / 4);
    },
  );

  it("can finish closing earlier without a width jump or changing the resistance gain", () => {
    const collapseAt = 89.6;
    expect(getSidebarDragWidth(128, 64, false, collapseAt)).toBe(176);
    expect(getSidebarDragWidth(118, 64, false, collapseAt)).toBe(173.5);
    expect(getSidebarDragWidth(collapseAt, 64, false, collapseAt)).toBe(64);
    expect(getSidebarDragWidth(collapseAt, 64, true, collapseAt)).toBe(64);
    expect(getSidebarDragWidth(collapseAt - 1, 64, true, collapseAt)).toBe(64);
    expect(getSidebarDragWidth(192, 64, true, collapseAt)).toBe(192);
  });

  it("uses the same curve for a zero-width offcanvas sidebar", () => {
    expect(getSidebarDragWidth(96, 0, true)).toBe(24);
    expect(getSidebarDragWidth(96, 0, false)).toBe(168);
    expect(getSidebarDragWidth(-100, 0, true)).toBe(0);
  });
});

describe("SidebarResizeHandle", () => {
  it("captures the pointer and uses drag distance without jumping to the pointer position", () => {
    const { handle, root, capture, onWidthCommit } = renderHandle();
    fireEvent.pointerDown(handle, { ...pointer, clientX: 250 });
    expect(capture).toHaveBeenCalledWith(1);
    expect(document.activeElement).toBe(handle);
    expect(handle.getAttribute("data-resizing")).toBe("true");
    expect(width(handle)).toBe(256);
    expect(root.style.getPropertyValue("--sidebar-drag-width")).toBe("256px");

    fireEvent.pointerMove(handle, { ...pointer, clientX: 294 });
    expect(width(handle)).toBe(300);
    expect(handle.getAttribute("aria-valuetext")).toBe("300 pixels");
    expect(root.style.getPropertyValue("--sidebar-drag-width")).toBe("300px");
    fireEvent.pointerMove(handle, { ...pointer, clientX: 280 });
    expect(width(handle)).toBe(286);
    expect(root.style.getPropertyValue("--sidebar-drag-width")).toBe("286px");
    expect(screen.getByTestId("committed-width").textContent).toBe("256");
    expect(onWidthCommit).not.toHaveBeenCalled();
    fireEvent.pointerUp(handle, pointer);
    expect(onWidthCommit).toHaveBeenCalledExactlyOnceWith(286);
    expect(screen.getByTestId("committed-width").textContent).toBe("286");
    expect(root.style.getPropertyValue("--sidebar-drag-width")).toBe("");
  });

  it("clamps pointer resizing to the minimum and maximum widths", () => {
    const { handle, root, onWidthCommit } = renderHandle();
    fireEvent.pointerDown(handle, { ...pointer, clientX: 256 });
    fireEvent.pointerMove(handle, { ...pointer, clientX: -500 });
    expect(width(handle)).toBe(192);
    expect(onWidthCommit).toHaveBeenCalledExactlyOnceWith(192);
    onWidthCommit.mockClear();
    fireEvent.pointerMove(handle, { ...pointer, clientX: 1000 });
    expect(width(handle)).toBe(480);
    expect(root.style.getPropertyValue("--sidebar-drag-width")).toBe("480px");
    expect(onWidthCommit).not.toHaveBeenCalled();
    fireEvent.pointerUp(handle, pointer);
    expect(onWidthCommit).toHaveBeenCalledExactlyOnceWith(480);
  });

  it.each(["pointerUp", "pointerCancel", "lostPointerCapture"] as const)(
    "ends resizing after %s and ignores further movement",
    (event) => {
      const { handle, root, onWidthCommit } = renderHandle();
      fireEvent.pointerDown(handle, { ...pointer, clientX: 256 });
      fireEvent.pointerMove(handle, { ...pointer, clientX: 300 });
      expect(width(handle)).toBe(300);
      expect(onWidthCommit).not.toHaveBeenCalled();

      fireEvent[event](handle, pointer);
      expect(handle.getAttribute("data-resizing")).toBe("false");
      expect(root.style.getPropertyValue("--sidebar-drag-width")).toBe("");
      expect(onWidthCommit).toHaveBeenCalledExactlyOnceWith(300);
      fireEvent.pointerMove(handle, { ...pointer, clientX: 400 });
      fireEvent.lostPointerCapture(handle, pointer);
      expect(width(handle)).toBe(300);
      expect(onWidthCommit).toHaveBeenCalledExactlyOnceWith(300);
    },
  );

  it("ignores nonprimary pointers, secondary buttons, and movement from another pointer", () => {
    const { handle, capture } = renderHandle();
    fireEvent.pointerDown(handle, { ...pointer, isPrimary: false, clientX: 256 });
    fireEvent.pointerMove(handle, { ...pointer, clientX: 400 });
    fireEvent.pointerDown(handle, { ...pointer, button: 2, clientX: 256 });
    expect(capture).not.toHaveBeenCalled();
    expect(width(handle)).toBe(256);
    expect(handle.getAttribute("data-resizing")).toBe("false");

    fireEvent.pointerDown(handle, { ...pointer, clientX: 256 });
    fireEvent.pointerMove(handle, { ...pointer, pointerId: 2, clientX: 400 });
    expect(width(handle)).toBe(256);
  });

  it("does not end an active drag when another pointer is released or cancelled", () => {
    const { handle, onWidthCommit } = renderHandle();
    fireEvent.pointerDown(handle, { ...pointer, clientX: 256 });
    for (const event of ["pointerUp", "pointerCancel", "lostPointerCapture"] as const) {
      fireEvent[event](handle, { ...pointer, pointerId: 2 });
      expect(handle.getAttribute("data-resizing")).toBe("true");
      expect(onWidthCommit).not.toHaveBeenCalled();
    }
    fireEvent.pointerMove(handle, { ...pointer, clientX: 320 });
    expect(width(handle)).toBe(320);
    fireEvent.pointerUp(handle, pointer);
    expect(handle.getAttribute("data-resizing")).toBe("false");
  });

  it.each(["left", "right"] as const)(
    "expands a collapsed %s sidebar only when dragged toward the content",
    (side) => {
      const { handle, root, onOpenChange, onWidthCommit } = renderHandle(side, true, 64);
      const direction = side === "left" ? 1 : -1;
      fireEvent.pointerDown(handle, { ...pointer, clientX: 100 });
      fireEvent.pointerMove(handle, { ...pointer, clientX: 100 - 30 * direction });
      fireEvent.pointerUp(handle, pointer);
      fireEvent.click(handle, { detail: 1 });
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(onWidthCommit).toHaveBeenCalledExactlyOnceWith(192);
      onWidthCommit.mockClear();

      fireEvent.pointerDown(handle, { ...pointer, clientX: 100 });
      fireEvent.pointerMove(handle, { ...pointer, clientX: 100 + 4 * direction });
      expect(onOpenChange).not.toHaveBeenCalled();
      fireEvent.pointerMove(handle, { ...pointer, clientX: 100 + 64 * direction });
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(root.style.getPropertyValue("--sidebar-drag-width")).toBe("80px");
      expect(onWidthCommit).not.toHaveBeenCalled();
      fireEvent.pointerMove(handle, { ...pointer, clientX: 100 + 128 * direction });
      expect(onOpenChange).toHaveBeenCalledWith(true);
      expect(root.style.getPropertyValue("--sidebar-drag-width")).toBe("192px");
      expect(onWidthCommit).toHaveBeenCalledExactlyOnceWith(192);
    },
  );

  it("commits the final clamped width and clears the CSS override when unmounted during a gesture", () => {
    const { handle, root, onWidthCommit, unmount } = renderHandle();
    fireEvent.pointerDown(handle, { ...pointer, clientX: 256 });
    fireEvent.pointerMove(handle, { ...pointer, clientX: 96 });
    expect(root.style.getPropertyValue("--sidebar-drag-width")).toBe("168px");
    expect(onWidthCommit).not.toHaveBeenCalled();
    unmount();
    expect(root.style.getPropertyValue("--sidebar-drag-width")).toBe("");
    expect(onWidthCommit).toHaveBeenCalledExactlyOnceWith(192);
  });

  it("finishes an active drag before applying keyboard resizing to its live width", () => {
    const { handle, root, onWidthCommit } = renderHandle();
    fireEvent.pointerDown(handle, { ...pointer, clientX: 256 });
    fireEvent.pointerMove(handle, { ...pointer, clientX: 300 });
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(width(handle)).toBe(316);
    expect(root.style.getPropertyValue("--sidebar-drag-width")).toBe("");
    expect(handle.getAttribute("data-resizing")).toBe("false");
    expect(onWidthCommit).toHaveBeenCalledExactlyOnceWith(316);
    fireEvent.pointerMove(handle, { ...pointer, clientX: 400 });
    fireEvent.pointerUp(handle, pointer);
    expect(width(handle)).toBe(316);
    expect(onWidthCommit).toHaveBeenCalledExactlyOnceWith(316);
  });

  it("reverses pointer and arrow-key resizing for a right-side sidebar", () => {
    const { handle } = renderHandle("right");
    fireEvent.pointerDown(handle, { ...pointer, clientX: 1000 });
    fireEvent.pointerMove(handle, { ...pointer, clientX: 960 });
    expect(width(handle)).toBe(296);
    fireEvent.pointerUp(handle, pointer);
    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    expect(width(handle)).toBe(312);
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(width(handle)).toBe(296);
  });
});
