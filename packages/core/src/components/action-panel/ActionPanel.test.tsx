import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActionPanel } from "./ActionPanel";
import {
  CommandPaletteProvider,
  useCommandPaletteActions,
} from "../../contexts/command-palette-context";

const MockIcon = () => <span data-testid="mock-icon">icon</span>;

afterEach(() => {
  cleanup();
});

const renderActionPanel = (props: React.ComponentProps<typeof ActionPanel>) =>
  render(
    <CommandPaletteProvider>
      <ActionPanel {...props} />
    </CommandPaletteProvider>,
  );

describe("ActionPanel", () => {
  it("renders title", () => {
    renderActionPanel({ title: "Actions", actions: [] });
    const heading = screen.getByRole("heading", { name: "Actions" });
    expect(heading).toBeDefined();
    expect(heading.textContent).toBe("Actions");
  });

  it("renders empty state when no actions", () => {
    renderActionPanel({ title: "Actions", actions: [] });
    expect(screen.getByText("No actions available")).toBeDefined();
  });

  it("renders action list with buttons when onClick is provided", () => {
    const actions = [
      {
        key: "1",
        label: "Create invoice",
        icon: <MockIcon />,
        onClick: () => {},
      },
      { key: "2", label: "Edit order", icon: <MockIcon />, onClick: () => {} },
    ];
    renderActionPanel({ title: "Actions", actions });

    expect(screen.getByRole("button", { name: "Create invoice" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Edit order" })).toBeDefined();
    expect(screen.getAllByTestId("mock-icon").length).toBe(2);
  });

  it("calls onClick when action button is clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderActionPanel({
      title: "Actions",
      actions: [{ key: "1", label: "Do something", icon: <MockIcon />, onClick }],
    });

    await user.click(screen.getByRole("button", { name: "Do something" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("applies disabled state to button action", () => {
    renderActionPanel({
      title: "Actions",
      actions: [
        {
          key: "1",
          label: "Disabled action",
          icon: <MockIcon />,
          onClick: () => {},
          disabled: true,
        },
      ],
    });

    const button = screen.getByRole("button", { name: "Disabled action" });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button).toHaveProperty("disabled", true);
  });

  it("accepts custom className", () => {
    const { container } = renderActionPanel({
      title: "Actions",
      actions: [],
      className: "custom-panel",
    });
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("custom-panel");
  });

  it("loading row is non-interactive and has aria-busy", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderActionPanel({
      title: "Actions",
      actions: [
        {
          key: "1",
          label: "Submit",
          icon: <MockIcon />,
          onClick,
          loading: true,
        },
      ],
    });

    const button = screen.getByRole("button", { name: "Submit" });
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button).toHaveProperty("disabled", true);

    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("loading row shows spinner in icon slot", () => {
    renderActionPanel({
      title: "Actions",
      actions: [
        {
          key: "1",
          label: "Saving",
          icon: <MockIcon />,
          onClick: () => {},
          loading: true,
        },
      ],
    });

    expect(screen.getByTestId("action-panel-spinner")).toBeDefined();
    expect(screen.queryByTestId("mock-icon")).toBeNull();
  });

  it("disabled and loading row is non-interactive", () => {
    renderActionPanel({
      title: "Actions",
      actions: [
        {
          key: "1",
          label: "Action",
          icon: <MockIcon />,
          onClick: () => {},
          disabled: true,
          loading: true,
        },
      ],
    });

    const button = screen.getByRole("button", { name: "Action" });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button).toHaveProperty("disabled", true);
  });
});

describe("ActionPanel context registration", () => {
  const ActionsReader = ({ onActions }: { onActions: (a: unknown[]) => void }) => {
    const actions = useCommandPaletteActions();
    onActions(actions);
    return null;
  };

  it("registers actions to CommandPaletteContext on mount", () => {
    const onActions = vi.fn();

    render(
      <CommandPaletteProvider>
        <ActionPanel
          title="My Panel"
          actions={[
            {
              key: "a1",
              label: "Action One",
              icon: <MockIcon />,
              onClick: () => {},
            },
            {
              key: "a2",
              label: "Action Two",
              icon: <MockIcon />,
              onClick: () => {},
            },
          ]}
        />
        <ActionsReader onActions={onActions} />
      </CommandPaletteProvider>,
    );

    const lastCall = onActions.mock.calls[onActions.mock.calls.length - 1][0];
    expect(lastCall).toHaveLength(2);
    expect(lastCall[0].key).toBe("a1");
    expect(lastCall[0].label).toBe("Action One");
    expect(lastCall[0].group).toBe("My Panel");
    expect(lastCall[1].key).toBe("a2");
  });

  it("does not register disabled or loading actions", () => {
    const onActions = vi.fn();

    render(
      <CommandPaletteProvider>
        <ActionPanel
          title="Panel"
          actions={[
            { key: "ok", label: "Ok", icon: <MockIcon />, onClick: () => {} },
            {
              key: "disabled",
              label: "Disabled",
              icon: <MockIcon />,
              onClick: () => {},
              disabled: true,
            },
            {
              key: "loading",
              label: "Loading",
              icon: <MockIcon />,
              onClick: () => {},
              loading: true,
            },
            { key: "no-click", label: "No Click", icon: <MockIcon /> },
          ]}
        />
        <ActionsReader onActions={onActions} />
      </CommandPaletteProvider>,
    );

    const lastCall = onActions.mock.calls[onActions.mock.calls.length - 1][0];
    expect(lastCall).toHaveLength(1);
    expect(lastCall[0].key).toBe("ok");
  });

  it("unregisters actions when ActionPanel unmounts", () => {
    const onActions = vi.fn();

    // Use rerender so the same CommandPaletteProvider instance survives
    const { rerender } = render(
      <CommandPaletteProvider>
        <ActionPanel
          title="Panel"
          actions={[
            {
              key: "a1",
              label: "Action",
              icon: <MockIcon />,
              onClick: () => {},
            },
          ]}
        />
        <ActionsReader onActions={onActions} />
      </CommandPaletteProvider>,
    );

    // Actions registered
    const beforeUnmount = onActions.mock.calls[onActions.mock.calls.length - 1][0];
    expect(beforeUnmount).toHaveLength(1);

    // Remove ActionPanel but keep the provider alive
    rerender(
      <CommandPaletteProvider>
        <ActionsReader onActions={onActions} />
      </CommandPaletteProvider>,
    );

    const afterUnmount = onActions.mock.calls[onActions.mock.calls.length - 1][0];
    expect(afterUnmount).toHaveLength(0);
  });
});
