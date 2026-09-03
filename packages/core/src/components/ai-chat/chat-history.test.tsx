import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ChatHistory, type ChatHistoryGroupData } from "./chat-history";

afterEach(() => {
  cleanup();
});

const GROUPS: ChatHistoryGroupData[] = [
  { title: "Today", items: [{ id: "1", title: "Creating a purchase order" }] },
  { title: "Previous 7 days", items: [] },
];

describe("ChatHistory", () => {
  it("renders only non-empty groups", () => {
    render(<ChatHistory groups={GROUPS} />);
    expect(screen.getByText("Today")).toBeDefined();
    expect(screen.queryByText("Previous 7 days")).toBeNull();
  });

  it("calls onSelect with the conversation id", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ChatHistory groups={GROUPS} onSelect={onSelect} />);
    await user.click(screen.getByText("Creating a purchase order"));
    expect(onSelect).toHaveBeenCalledWith("1");
  });

  it("shows a delete action only when onDelete is provided", () => {
    const { rerender } = render(<ChatHistory groups={GROUPS} />);
    expect(screen.queryByRole("button", { name: /Delete/ })).toBeNull();

    rerender(<ChatHistory groups={GROUPS} onDelete={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Delete/ })).toBeDefined();
  });
});
