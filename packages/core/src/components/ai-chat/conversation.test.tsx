import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Conversation, ConversationScrollButton } from "./conversation";

afterEach(() => {
  cleanup();
});

// happy-dom does no layout, so the scroll metrics the pin logic reads are all
// 0. Driving them by hand is the only way to exercise that logic at all.
function setScrollMetrics(
  el: HTMLElement,
  metrics: { scrollHeight: number; clientHeight: number; scrollTop: number },
) {
  Object.defineProperty(el, "scrollHeight", { value: metrics.scrollHeight, configurable: true });
  Object.defineProperty(el, "clientHeight", { value: metrics.clientHeight, configurable: true });
  Object.defineProperty(el, "scrollTop", {
    value: metrics.scrollTop,
    writable: true,
    configurable: true,
  });
  fireEvent.scroll(el);
}

function renderConversation() {
  const view = render(<Conversation>content</Conversation>);
  return { ...view, viewport: screen.getByRole("log") };
}

const scrollButton = () => screen.queryByRole("button", { name: "Scroll to latest message" });

describe("Conversation", () => {
  it("hides the scroll button while the reader is at the bottom", () => {
    renderConversation();
    expect(scrollButton()).toBeNull();
  });

  it("shows the scroll button once the reader scrolls up", () => {
    const { viewport } = renderConversation();

    // Move down first so the next move registers as upward.
    setScrollMetrics(viewport, { scrollHeight: 1000, clientHeight: 300, scrollTop: 500 });
    expect(scrollButton()).toBeNull();

    setScrollMetrics(viewport, { scrollHeight: 1000, clientHeight: 300, scrollTop: 100 });
    expect(scrollButton()).not.toBeNull();
  });

  // The invariant the pin logic exists for: while a response streams, the
  // bottom moves away from a reader who has not moved. Treating that as
  // "reader scrolled away" would pop the scroll button up mid-answer.
  it("stays pinned when content grows underneath the reader", () => {
    const { viewport } = renderConversation();

    setScrollMetrics(viewport, { scrollHeight: 1000, clientHeight: 300, scrollTop: 700 });
    expect(scrollButton()).toBeNull();

    // Content grew; scrollTop is untouched, so the reader has not moved.
    setScrollMetrics(viewport, { scrollHeight: 2000, clientHeight: 300, scrollTop: 700 });
    expect(scrollButton()).toBeNull();
  });

  it("re-pins when the reader scrolls back to the bottom", () => {
    const { viewport } = renderConversation();

    setScrollMetrics(viewport, { scrollHeight: 1000, clientHeight: 300, scrollTop: 500 });
    setScrollMetrics(viewport, { scrollHeight: 1000, clientHeight: 300, scrollTop: 100 });
    expect(scrollButton()).not.toBeNull();

    setScrollMetrics(viewport, { scrollHeight: 1000, clientHeight: 300, scrollTop: 700 });
    expect(scrollButton()).toBeNull();
  });

  it("scrolls to the bottom and re-pins when the button is pressed", async () => {
    const user = userEvent.setup();
    const { viewport } = renderConversation();
    const scrollTo = vi.fn();
    viewport.scrollTo = scrollTo as unknown as HTMLElement["scrollTo"];

    setScrollMetrics(viewport, { scrollHeight: 1000, clientHeight: 300, scrollTop: 500 });
    setScrollMetrics(viewport, { scrollHeight: 1000, clientHeight: 300, scrollTop: 100 });

    const button = scrollButton();
    expect(button).not.toBeNull();
    await user.click(button!);

    expect(scrollTo).toHaveBeenCalledWith({ top: 1000, behavior: "smooth" });
    expect(scrollButton()).toBeNull();
  });

  it("follows content growth while pinned, and stops once autoScroll is off", () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    const original = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class {
      observe = observe;
      disconnect = disconnect;
      unobserve = vi.fn();
    } as unknown as typeof ResizeObserver;

    try {
      const { unmount } = render(<Conversation>content</Conversation>);
      expect(observe).toHaveBeenCalledTimes(1);
      unmount();
      expect(disconnect).toHaveBeenCalledTimes(1);

      observe.mockClear();
      render(<Conversation autoScroll={false}>content</Conversation>);
      expect(observe).not.toHaveBeenCalled();
    } finally {
      globalThis.ResizeObserver = original;
    }
  });

  it("tells the caller when the scroll button is used outside a Conversation", () => {
    // React logs the error it re-throws; silence it so the run stays readable.
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(() => render(<ConversationScrollButton />)).toThrow(
        /must be used within <Conversation>/,
      );
    } finally {
      consoleError.mockRestore();
    }
  });
});
