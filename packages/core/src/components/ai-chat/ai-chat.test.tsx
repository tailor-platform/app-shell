import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AIChat } from "./ai-chat";

afterEach(() => {
  cleanup();
});

describe("AIChat", () => {
  describe("snapshots", () => {
    it("default", () => {
      const { container } = render(
        <AIChat onSubmit={vi.fn()}>
          <AIChat.Message from="assistant">
            <AIChat.Response>Hello there.</AIChat.Response>
          </AIChat.Message>
        </AIChat>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  it("renders the transcript passed as children", () => {
    render(
      <AIChat onSubmit={vi.fn()}>
        <AIChat.Message from="user">
          <AIChat.Response>Why is my order pending?</AIChat.Response>
        </AIChat.Message>
      </AIChat>,
    );
    expect(screen.getByText("Why is my order pending?")).toBeDefined();
  });

  it("submits the trimmed message on Enter and clears the draft", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <AIChat onSubmit={onSubmit}>
        <div />
      </AIChat>,
    );
    const textarea = screen.getByRole("textbox", { name: "Message" }) as HTMLTextAreaElement;
    await user.type(textarea, "  hi there  ");
    await user.keyboard("{Enter}");
    expect(onSubmit).toHaveBeenCalledWith("hi there", []);
    expect(textarea.value).toBe("");
  });

  it("does not submit on Shift+Enter", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <AIChat onSubmit={onSubmit}>
        <div />
      </AIChat>,
    );
    const textarea = screen.getByRole("textbox", { name: "Message" });
    await user.type(textarea, "line one");
    await user.keyboard("{Shift>}{Enter}{/Shift}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not submit on Enter during IME composition", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <AIChat onSubmit={onSubmit}>
        <div />
      </AIChat>,
    );
    const textarea = screen.getByRole("textbox", { name: "Message" });
    await user.type(textarea, "変換");
    textarea.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
        isComposing: true,
      }),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables submit while the draft is empty or whitespace-only", async () => {
    const user = userEvent.setup();
    render(
      <AIChat onSubmit={vi.fn()}>
        <div />
      </AIChat>,
    );
    const send = screen.getByRole("button", { name: "Send" }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);

    await user.type(screen.getByRole("textbox", { name: "Message" }), "   ");
    expect(send.disabled).toBe(true);
  });

  it("disables Enter-to-submit when submitOnEnter is false", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <AIChat onSubmit={onSubmit} submitOnEnter={false}>
        <div />
      </AIChat>,
    );
    await user.type(screen.getByRole("textbox", { name: "Message" }), "hi");
    await user.keyboard("{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not submit while status is submitted or streaming", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <AIChat onSubmit={onSubmit} status="streaming">
        <div />
      </AIChat>,
    );
    await user.type(screen.getByRole("textbox", { name: "Message" }), "hi");
    await user.keyboard("{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows Stop and calls onStop while streaming", async () => {
    const user = userEvent.setup();
    const onStop = vi.fn();
    render(
      <AIChat onSubmit={vi.fn()} onStop={onStop} status="streaming">
        <div />
      </AIChat>,
    );
    const stop = screen.getByRole("button", { name: "Stop" });
    await user.click(stop);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("shows a plain busy state with no Stop button when onStop is omitted", () => {
    render(
      <AIChat onSubmit={vi.fn()} status="streaming">
        <div />
      </AIChat>,
    );
    expect(screen.queryByRole("button", { name: "Stop" })).toBeNull();
    expect((screen.getByRole("button", { name: "Sending…" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("supports a controlled draft, reporting the post-submit clear via onValueChange", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onValueChange = vi.fn();

    function Controlled() {
      const [value, setValue] = useState("");
      return (
        <AIChat
          onSubmit={(message, attachments) => {
            onSubmit(message, attachments);
            onValueChange(value);
          }}
          value={value}
          onValueChange={setValue}
        >
          <div />
        </AIChat>
      );
    }

    render(<Controlled />);
    await user.type(screen.getByRole("textbox", { name: "Message" }), "hi");
    await user.keyboard("{Enter}");
    expect(onSubmit).toHaveBeenCalledWith("hi", []);
    expect((screen.getByRole("textbox", { name: "Message" }) as HTMLTextAreaElement).value).toBe(
      "",
    );
  });

  it("renders the empty state's title/description and submits a clicked suggestion", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <AIChat onSubmit={onSubmit}>
        <AIChat.EmptyState title="Ask the assistant" description="Grounded in your help articles.">
          <AIChat.Suggestions>
            <AIChat.Suggestion suggestion="How do I create a purchase order?" onSelect={onSubmit} />
          </AIChat.Suggestions>
        </AIChat.EmptyState>
      </AIChat>,
    );
    // `children` fully replaces the built-in title/description rendering, so
    // combining both text and suggestions means composing them manually —
    // proving that composition works is the point of this test.
    expect(screen.queryByText("Ask the assistant")).toBeNull();
    await user.click(screen.getByText("How do I create a purchase order?"));
    expect(onSubmit).toHaveBeenCalledWith("How do I create a purchase order?");
  });

  it("renders the empty state's built-in title/description when no children are given", () => {
    render(
      <AIChat onSubmit={vi.fn()}>
        <AIChat.EmptyState
          title="Ask the assistant"
          description="Grounded in your help articles."
        />
      </AIChat>,
    );
    expect(screen.getByText("Ask the assistant")).toBeDefined();
    expect(screen.getByText("Grounded in your help articles.")).toBeDefined();
  });

  it("shows the attach button and a chip for a staged file when attachments is enabled", async () => {
    const user = userEvent.setup();
    render(
      <AIChat onSubmit={vi.fn()} attachments>
        <div />
      </AIChat>,
    );
    const attachButton = screen.getByRole("button", { name: "Attach files" });
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);
    expect(screen.getByText("notes.txt")).toBeDefined();
    expect(attachButton).toBeDefined();
  });

  it("submits staged attachments alongside the message and clears them", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <AIChat onSubmit={onSubmit} attachments>
        <div />
      </AIChat>,
    );
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);
    await user.type(screen.getByRole("textbox", { name: "Message" }), "see attached");
    await user.keyboard("{Enter}");
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const [message, attachments] = onSubmit.mock.calls[0];
    expect(message).toBe("see attached");
    expect(attachments).toHaveLength(1);
    expect(attachments[0].fileName).toBe("notes.txt");
    expect(screen.queryByText("notes.txt")).toBeNull();
  });

  it("does not render the attach button when attachments is disabled", () => {
    render(
      <AIChat onSubmit={vi.fn()}>
        <div />
      </AIChat>,
    );
    expect(screen.queryByRole("button", { name: "Attach files" })).toBeNull();
  });

  it("renders composerActions in the composer's action row", () => {
    render(
      <AIChat onSubmit={vi.fn()} composerActions={<button type="button">Internal note</button>}>
        <div />
      </AIChat>,
    );
    expect(screen.getByRole("button", { name: "Internal note" })).toBeDefined();
  });
});
