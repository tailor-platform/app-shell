import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AIChat } from "./ai-chat";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const textbox = () => screen.getByRole("textbox", { name: "Message" }) as HTMLTextAreaElement;
const sendButton = () => screen.getByRole("button", { name: "Send" }) as HTMLButtonElement;
const fileInput = () => document.querySelector('input[type="file"]') as HTMLInputElement;

describe("AIChat", () => {
  describe("snapshots", () => {
    it("default", () => {
      const { container } = render(
        <AIChat>
          <AIChat.Conversation>
            <AIChat.Message from="assistant">
              <AIChat.Response>Hello there.</AIChat.Response>
            </AIChat.Message>
          </AIChat.Conversation>
          <AIChat.Composer onSubmit={vi.fn()} />
        </AIChat>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("with header", () => {
      const { container } = render(
        <AIChat>
          <AIChat.Header
            title="Assistant"
            actions={
              <AIChat.Action label="Clear conversation">
                <span aria-hidden>x</span>
              </AIChat.Action>
            }
          />
          <AIChat.Conversation>
            <div />
          </AIChat.Conversation>
          <AIChat.Composer onSubmit={vi.fn()} />
        </AIChat>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  describe("region placement", () => {
    it("renders Header, Conversation, Composer in that order regardless of source order", () => {
      const { container } = render(
        <AIChat>
          <AIChat.Composer onSubmit={vi.fn()} />
          <AIChat.Conversation>
            <div />
          </AIChat.Conversation>
          <AIChat.Header title="Assistant" />
        </AIChat>,
      );
      const slots = Array.from(container.querySelector('[data-slot="ai-chat"]')!.children).map(
        (el) => el.getAttribute("data-slot"),
      );
      expect(slots).toEqual(["ai-chat-header", "ai-chat-conversation", "ai-chat-composer"]);
    });

    it("renders a read-only transcript when there is no Composer", () => {
      render(
        <AIChat>
          <AIChat.Conversation>
            <AIChat.Message from="user">
              <AIChat.Response>Archived question</AIChat.Response>
            </AIChat.Message>
          </AIChat.Conversation>
        </AIChat>,
      );
      expect(screen.getByText("Archived question")).toBeDefined();
      expect(screen.queryByRole("textbox")).toBeNull();
    });

    it("warns and drops children that are not one of the three regions", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      render(
        <AIChat>
          <AIChat.Conversation>
            <div />
          </AIChat.Conversation>
          <AIChat.Message from="user">
            <AIChat.Response>Loose transcript</AIChat.Response>
          </AIChat.Message>
        </AIChat>,
      );
      expect(screen.queryByText("Loose transcript")).toBeNull();
      expect(warn).toHaveBeenCalledWith(expect.stringMatching(/children must be AIChat\.Header/));
    });

    it("ignores conditional false/null children without warning", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const showHeader = false;
      render(
        <AIChat>
          {showHeader && <AIChat.Header title="Assistant" />}
          {null}
          <AIChat.Conversation>
            <div />
          </AIChat.Conversation>
        </AIChat>,
      );
      expect(warn).not.toHaveBeenCalled();
    });

    it("warns and keeps the first when a region is duplicated", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      render(
        <AIChat>
          <AIChat.Header title="First" />
          <AIChat.Header title="Second" />
          <AIChat.Conversation>
            <div />
          </AIChat.Conversation>
        </AIChat>,
      );
      expect(screen.getByText("First")).toBeDefined();
      expect(screen.queryByText("Second")).toBeNull();
      expect(warn).toHaveBeenCalledWith(expect.stringMatching(/more than one AIChat\.Header/));
    });

    it("warns when there is no Conversation", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      render(
        <AIChat>
          <AIChat.Composer onSubmit={vi.fn()} />
        </AIChat>,
      );
      expect(warn).toHaveBeenCalledWith(expect.stringMatching(/no AIChat\.Conversation/));
    });

    it("tells the caller when Composer is used outside AIChat", () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() => render(<AIChat.Composer onSubmit={vi.fn()} />)).toThrow(
        /must be used within <AIChat>/,
      );
      consoleError.mockRestore();
    });
  });

  describe("header", () => {
    it("renders the title and a default graphic", () => {
      const { container } = render(
        <AIChat>
          <AIChat.Header title="Assistant" />
          <AIChat.Conversation>
            <div />
          </AIChat.Conversation>
        </AIChat>,
      );
      expect(screen.getByText("Assistant")).toBeDefined();
      expect(container.querySelector('[data-slot="ai-chat-header"] svg')).not.toBeNull();
    });

    it("drops the default graphic when icon is null", () => {
      const { container } = render(
        <AIChat>
          <AIChat.Header title="Assistant" icon={null} />
          <AIChat.Conversation>
            <div />
          </AIChat.Conversation>
        </AIChat>,
      );
      expect(container.querySelector('[data-slot="ai-chat-header"] svg')).toBeNull();
    });

    it("renders actions", () => {
      render(
        <AIChat>
          <AIChat.Header actions={<button type="button">Clear</button>} />
          <AIChat.Conversation>
            <div />
          </AIChat.Conversation>
        </AIChat>,
      );
      expect(screen.getByRole("button", { name: "Clear" })).toBeDefined();
    });
  });

  describe("composer", () => {
    function renderComposer(
      composerProps: Partial<Parameters<typeof AIChat.Composer>[0]> = {},
      status?: "ready" | "submitted" | "streaming" | "error",
    ) {
      const onSubmit = vi.fn();
      const view = render(
        <AIChat status={status}>
          <AIChat.Conversation>
            <div />
          </AIChat.Conversation>
          <AIChat.Composer onSubmit={onSubmit} {...composerProps} />
        </AIChat>,
      );
      return { ...view, onSubmit };
    }

    it("submits the trimmed message on Enter and clears the draft", async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderComposer();
      await user.type(textbox(), "  hi there  ");
      await user.keyboard("{Enter}");
      expect(onSubmit).toHaveBeenCalledWith("hi there", []);
      expect(textbox().value).toBe("");
    });

    it("does not submit on Shift+Enter", async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderComposer();
      await user.type(textbox(), "line one");
      await user.keyboard("{Shift>}{Enter}{/Shift}");
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("does not submit on Enter during IME composition", async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderComposer();
      await user.type(textbox(), "変換");
      textbox().dispatchEvent(
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
      renderComposer();
      expect(sendButton().disabled).toBe(true);
      await user.type(textbox(), "   ");
      expect(sendButton().disabled).toBe(true);
    });

    it("disables Enter-to-submit when submitOnEnter is false", async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderComposer({ submitOnEnter: false });
      await user.type(textbox(), "hi");
      await user.keyboard("{Enter}");
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it.each(["submitted", "streaming"] as const)(
      "does not submit while the chat's status is %s",
      async (status) => {
        const user = userEvent.setup();
        const { onSubmit } = renderComposer({ defaultValue: "hi" }, status);
        await user.click(textbox());
        await user.keyboard("{Enter}");
        expect(onSubmit).not.toHaveBeenCalled();
      },
    );

    it("disables the composer when disabled", async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderComposer({ disabled: true, defaultValue: "already typed" });
      expect(textbox().disabled).toBe(true);
      expect(sendButton().disabled).toBe(true);
      await user.keyboard("{Enter}");
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("shows Stop and calls onStop while the chat is streaming", async () => {
      const user = userEvent.setup();
      const onStop = vi.fn();
      renderComposer({ onStop }, "streaming");
      await user.click(screen.getByRole("button", { name: "Stop" }));
      expect(onStop).toHaveBeenCalledTimes(1);
    });

    it("shows a plain busy state with no Stop button when onStop is omitted", () => {
      renderComposer({}, "streaming");
      expect(screen.queryByRole("button", { name: "Stop" })).toBeNull();
      expect((screen.getByRole("button", { name: "Sending…" }) as HTMLButtonElement).disabled).toBe(
        true,
      );
    });

    it("supports a controlled draft, reporting the post-submit clear via onValueChange", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const seen: string[] = [];

      function Controlled() {
        const [value, setValue] = useState("");
        return (
          <AIChat>
            <AIChat.Conversation>
              <div />
            </AIChat.Conversation>
            <AIChat.Composer
              onSubmit={onSubmit}
              value={value}
              onValueChange={(next) => {
                seen.push(next);
                setValue(next);
              }}
            />
          </AIChat>
        );
      }

      render(<Controlled />);
      await user.type(textbox(), "hi");
      await user.keyboard("{Enter}");
      expect(onSubmit).toHaveBeenCalledWith("hi", []);
      expect(seen.at(-1)).toBe("");
      expect(textbox().value).toBe("");
    });

    it("renders actions in the action row", () => {
      renderComposer({ actions: <button type="button">Internal note</button> });
      expect(screen.getByRole("button", { name: "Internal note" })).toBeDefined();
    });

    describe("attachments", () => {
      it("does not render the attach button by default", () => {
        renderComposer();
        expect(screen.queryByRole("button", { name: "Attach files" })).toBeNull();
      });

      it("shows the attach button and a chip for a staged file", async () => {
        const user = userEvent.setup();
        renderComposer({ attachments: true });
        expect(screen.getByRole("button", { name: "Attach files" })).toBeDefined();
        await user.upload(fileInput(), new File(["hello"], "notes.txt", { type: "text/plain" }));
        expect(screen.getByText("notes.txt")).toBeDefined();
      });

      it("shows a thumbnail for a staged image", async () => {
        const user = userEvent.setup();
        renderComposer({ attachments: true });
        await user.upload(fileInput(), new File(["x"], "shot.png", { type: "image/png" }));
        expect(screen.getByRole("img", { name: "shot.png" }).getAttribute("src")).toMatch(
          /^blob:|^data:/,
        );
      });

      it("submits staged attachments alongside the message and clears them", async () => {
        const user = userEvent.setup();
        const { onSubmit } = renderComposer({ attachments: true });
        await user.upload(fileInput(), new File(["hello"], "notes.txt", { type: "text/plain" }));
        await user.type(textbox(), "see attached");
        await user.keyboard("{Enter}");
        const [message, attachments] = onSubmit.mock.calls[0];
        expect(message).toBe("see attached");
        expect(attachments).toHaveLength(1);
        expect(attachments[0].fileName).toBe("notes.txt");
        expect(screen.queryByText("notes.txt")).toBeNull();
      });

      it("removes a staged attachment from its chip", async () => {
        const user = userEvent.setup();
        renderComposer({ attachments: true });
        await user.upload(fileInput(), new File(["x"], "notes.txt", { type: "text/plain" }));
        await user.click(screen.getByRole("button", { name: "Remove notes.txt" }));
        expect(screen.queryByText("notes.txt")).toBeNull();
      });

      it("removes the newest attachment on Backspace in an empty composer", async () => {
        const user = userEvent.setup();
        renderComposer({ attachments: true });
        await user.upload(fileInput(), [
          new File(["a"], "first.txt", { type: "text/plain" }),
          new File(["b"], "second.txt", { type: "text/plain" }),
        ]);
        await user.click(textbox());
        await user.keyboard("{Backspace}");
        expect(screen.queryByText("second.txt")).toBeNull();
        expect(screen.getByText("first.txt")).toBeDefined();
      });

      it("opens the file picker from the attach button", async () => {
        const user = userEvent.setup();
        renderComposer({ attachments: true });
        const click = vi.spyOn(fileInput(), "click").mockImplementation(() => {});
        await user.click(screen.getByRole("button", { name: "Attach files" }));
        expect(click).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("transcript parts", () => {
    it("renders the empty state's built-in title/description when no children are given", () => {
      render(
        <AIChat>
          <AIChat.Conversation>
            <AIChat.EmptyState
              title="Ask the assistant"
              description="Grounded in your help articles."
            />
          </AIChat.Conversation>
        </AIChat>,
      );
      expect(screen.getByText("Ask the assistant")).toBeDefined();
      expect(screen.getByText("Grounded in your help articles.")).toBeDefined();
    });

    it("lets children replace the empty state's built-in text, and submits a clicked suggestion", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(
        <AIChat>
          <AIChat.Conversation>
            <AIChat.EmptyState title="Ask the assistant">
              <AIChat.Suggestions>
                <AIChat.Suggestion
                  suggestion="How do I create a purchase order?"
                  onSelect={onSelect}
                />
              </AIChat.Suggestions>
            </AIChat.EmptyState>
          </AIChat.Conversation>
        </AIChat>,
      );
      expect(screen.queryByText("Ask the assistant")).toBeNull();
      await user.click(screen.getByText("How do I create a purchase order?"));
      expect(onSelect).toHaveBeenCalledWith("How do I create a purchase order?");
    });

    it("renders message actions in an Actions row", () => {
      render(
        <AIChat>
          <AIChat.Conversation>
            <AIChat.Message from="assistant">
              <AIChat.Response>Answer.</AIChat.Response>
              <AIChat.Actions>
                <AIChat.Action label="Copy">
                  <span aria-hidden>c</span>
                </AIChat.Action>
              </AIChat.Actions>
            </AIChat.Message>
          </AIChat.Conversation>
        </AIChat>,
      );
      const row = document.querySelector('[data-slot="ai-chat-actions"]');
      expect(row?.querySelector('[data-slot="ai-chat-action"]')).not.toBeNull();
    });
  });
});
