import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Reasoning, ReasoningContent, ReasoningTrigger } from "./reasoning";

afterEach(() => {
  cleanup();
});

describe("Reasoning", () => {
  it("is open while isStreaming is true", () => {
    render(
      <Reasoning isStreaming>
        <ReasoningTrigger />
        <ReasoningContent>Thinking about it…</ReasoningContent>
      </Reasoning>,
    );
    expect(screen.getByText("Thinking…")).toBeDefined();
    expect(screen.getByText("Thinking about it…")).toBeDefined();
  });

  it("closes once streaming ends, showing the duration", () => {
    const { rerender } = render(
      <Reasoning isStreaming>
        <ReasoningTrigger />
        <ReasoningContent>Thinking about it…</ReasoningContent>
      </Reasoning>,
    );
    rerender(
      <Reasoning isStreaming={false} duration={3}>
        <ReasoningTrigger />
        <ReasoningContent>Thinking about it…</ReasoningContent>
      </Reasoning>,
    );
    expect(screen.getByText("Thought for 3s")).toBeDefined();
    expect(screen.queryByText("Thinking about it…")).toBeNull();
  });

  it("stays open after streaming ends once the reader has manually toggled it", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <Reasoning isStreaming>
        <ReasoningTrigger />
        <ReasoningContent>Thinking about it…</ReasoningContent>
      </Reasoning>,
    );
    // Auto-open while streaming; toggling closed is the reader taking over.
    await user.click(screen.getByRole("button"));
    rerender(
      <Reasoning isStreaming={false} duration={3}>
        <ReasoningTrigger />
        <ReasoningContent>Thinking about it…</ReasoningContent>
      </Reasoning>,
    );
    // Manual close should stick — auto-close-on-stream-end no longer applies.
    expect(screen.queryByText("Thinking about it…")).toBeNull();
  });
});
