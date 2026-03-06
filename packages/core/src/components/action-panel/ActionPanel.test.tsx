import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActionPanel } from "./ActionPanel";

const MockIcon = () => <span data-testid="mock-icon">icon</span>;

afterEach(() => {
  cleanup();
});

describe("ActionPanel", () => {
  it("renders title", () => {
    render(<ActionPanel title="Actions" actions={[]} />);
    const heading = screen.getByRole("heading", { name: "Actions" });
    expect(heading).toBeDefined();
    expect(heading.textContent).toBe("Actions");
  });

  it("renders empty state when no actions", () => {
    render(<ActionPanel title="Actions" actions={[]} />);
    expect(screen.getByText("No actions available")).toBeDefined();
  });

  it("renders action list with buttons when onClick is provided", () => {
    const actions = [
      { key: "1", label: "Create invoice", icon: <MockIcon />, onClick: () => {} },
      { key: "2", label: "Edit order", icon: <MockIcon />, onClick: () => {} },
    ];
    render(<ActionPanel title="Actions" actions={actions} />);

    expect(screen.getByRole("button", { name: "Create invoice" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Edit order" })).toBeDefined();
    expect(screen.getAllByTestId("mock-icon").length).toBe(2);
  });

  it("calls onClick when action button is clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <ActionPanel
        title="Actions"
        actions={[{ key: "1", label: "Do something", icon: <MockIcon />, onClick }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Do something" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders action as link when href is provided", () => {
    render(
      <ActionPanel
        title="Actions"
        actions={[{ key: "1", label: "View docs", icon: <MockIcon />, href: "/docs" }]}
      />,
    );

    const link = screen.getByRole("link", { name: "View docs" });
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toBe("/docs");
  });

  it("applies disabled state to button action", () => {
    render(
      <ActionPanel
        title="Actions"
        actions={[
          { key: "1", label: "Disabled action", icon: <MockIcon />, onClick: () => {}, disabled: true },
        ]}
      />,
    );

    const button = screen.getByRole("button", { name: "Disabled action" });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button).toHaveProperty("disabled", true);
  });

  it("accepts custom className", () => {
    const { container } = render(
      <ActionPanel title="Actions" actions={[]} className="custom-panel" />,
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("custom-panel");
  });
});
