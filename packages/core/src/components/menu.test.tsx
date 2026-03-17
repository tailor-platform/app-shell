import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Menu } from "./menu";

afterEach(() => {
  cleanup();
});

describe("Menu", () => {
  // ==========================================================================
  // Snapshots — verify full DOM structure for menu variations
  // ==========================================================================

  describe("snapshots", () => {
    it("closed menu (trigger only)", () => {
      const { container } = render(
        <Menu.Root>
          <Menu.Trigger>Open menu</Menu.Trigger>
          <Menu.Content>
            <Menu.Item>Edit</Menu.Item>
            <Menu.Item>Delete</Menu.Item>
          </Menu.Content>
        </Menu.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("open menu with items", async () => {
      const user = userEvent.setup();
      const { baseElement } = render(
        <Menu.Root>
          <Menu.Trigger data-testid="trigger">Open menu</Menu.Trigger>
          <Menu.Content>
            <Menu.Item>Edit</Menu.Item>
            <Menu.Item>Duplicate</Menu.Item>
            <Menu.Separator />
            <Menu.Item>Delete</Menu.Item>
          </Menu.Content>
        </Menu.Root>,
      );

      await user.click(screen.getByTestId("trigger"));
      await waitFor(() => {
        expect(screen.getByText("Edit")).toBeDefined();
      });
      expect(baseElement.innerHTML).toMatchSnapshot();
    });

    it("with groups and group labels", async () => {
      const user = userEvent.setup();
      const { baseElement } = render(
        <Menu.Root>
          <Menu.Trigger data-testid="trigger">Open</Menu.Trigger>
          <Menu.Content>
            <Menu.Group>
              <Menu.GroupLabel>Actions</Menu.GroupLabel>
              <Menu.Item>Edit</Menu.Item>
              <Menu.Item>Copy</Menu.Item>
            </Menu.Group>
            <Menu.Separator />
            <Menu.Group>
              <Menu.GroupLabel>Danger</Menu.GroupLabel>
              <Menu.Item>Delete</Menu.Item>
            </Menu.Group>
          </Menu.Content>
        </Menu.Root>,
      );

      await user.click(screen.getByTestId("trigger"));
      await waitFor(() => {
        expect(screen.getByText("Actions")).toBeDefined();
      });
      expect(baseElement.innerHTML).toMatchSnapshot();
    });

    it("with checkbox items", async () => {
      const user = userEvent.setup();
      const { baseElement } = render(
        <Menu.Root>
          <Menu.Trigger data-testid="trigger">Settings</Menu.Trigger>
          <Menu.Content>
            <Menu.CheckboxItem checked>
              <Menu.CheckboxItemIndicator>✓</Menu.CheckboxItemIndicator>
              Show toolbar
            </Menu.CheckboxItem>
            <Menu.CheckboxItem checked={false}>
              <Menu.CheckboxItemIndicator>✓</Menu.CheckboxItemIndicator>
              Dark mode
            </Menu.CheckboxItem>
          </Menu.Content>
        </Menu.Root>,
      );

      await user.click(screen.getByTestId("trigger"));
      await waitFor(() => {
        expect(screen.getByText("Show toolbar")).toBeDefined();
      });
      expect(baseElement.innerHTML).toMatchSnapshot();
    });

    it("with radio group", async () => {
      const user = userEvent.setup();
      const { baseElement } = render(
        <Menu.Root>
          <Menu.Trigger data-testid="trigger">View</Menu.Trigger>
          <Menu.Content>
            <Menu.RadioGroup value="list">
              <Menu.RadioItem value="list">
                <Menu.RadioItemIndicator>●</Menu.RadioItemIndicator>
                List
              </Menu.RadioItem>
              <Menu.RadioItem value="grid">
                <Menu.RadioItemIndicator>●</Menu.RadioItemIndicator>
                Grid
              </Menu.RadioItem>
            </Menu.RadioGroup>
          </Menu.Content>
        </Menu.Root>,
      );

      await user.click(screen.getByTestId("trigger"));
      await waitFor(() => {
        expect(screen.getByText("List")).toBeDefined();
      });
      expect(baseElement.innerHTML).toMatchSnapshot();
    });

    it("with disabled item", async () => {
      const user = userEvent.setup();
      const { baseElement } = render(
        <Menu.Root>
          <Menu.Trigger data-testid="trigger">Open</Menu.Trigger>
          <Menu.Content>
            <Menu.Item>Edit</Menu.Item>
            <Menu.Item disabled>Delete</Menu.Item>
          </Menu.Content>
        </Menu.Root>,
      );

      await user.click(screen.getByTestId("trigger"));
      await waitFor(() => {
        expect(screen.getByText("Edit")).toBeDefined();
      });
      expect(baseElement.innerHTML).toMatchSnapshot();
    });

    it("with submenu", () => {
      const { container } = render(
        <Menu.Root>
          <Menu.Trigger>Open</Menu.Trigger>
          <Menu.Content>
            <Menu.Item>Edit</Menu.Item>
            <Menu.SubmenuRoot>
              <Menu.SubmenuTrigger>More options</Menu.SubmenuTrigger>
              <Menu.Content>
                <Menu.Item>Option A</Menu.Item>
                <Menu.Item>Option B</Menu.Item>
              </Menu.Content>
            </Menu.SubmenuRoot>
          </Menu.Content>
        </Menu.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });
  });
});
