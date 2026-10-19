import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { AIChat } from "./index";

afterEach(() => {
  cleanup();
});

describe("AIChat.ToolCall", () => {
  it("renders a neutral tool-call label without implying success", () => {
    const { container } = render(<AIChat.ToolCall call={{ id: "call-1", name: "add" }} />);

    expect(screen.getByText("Tool call: add")).toBeDefined();
    expect(screen.queryByText("Done")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("renders multiple calls as separate rows in order and forwards className to the row", () => {
    const { container } = render(
      <>
        <AIChat.ToolCall call={{ id: "call-1", name: "first" }} className="consumer-class" />
        <AIChat.ToolCall call={{ id: "call-2", name: "second" }} />
      </>,
    );
    const rows = Array.from(container.querySelectorAll('[data-slot="ai-chat-tool-call"]'));

    expect(rows.map((row) => row.textContent)).toEqual(["Tool call: first", "Tool call: second"]);
    expect(rows.every((row) => row.classList.contains("astw:flex"))).toBe(true);
    expect(rows[0]?.classList.contains("consumer-class")).toBe(true);
  });
});
