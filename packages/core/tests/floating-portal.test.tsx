import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, describe, expect, it } from "vitest";
import { ComboboxParts as Combobox } from "@/components/combobox";
import { Dialog } from "@/components/dialog";
import { Toaster } from "@/components/internals/sonner";
import { Menu } from "@/components/menu";
import { SelectParts as Select } from "@/components/select";
import { Sheet } from "@/components/sheet";
import { Tooltip } from "@/components/tooltip";
import { ThemeProvider } from "@/contexts/theme-context";

// Guards the first mechanism in decisions/floating-ui-stacking.md: every floating
// component has one exit, a portal to the end of body. A popup that rendered
// inside the page would be trapped by the first ancestor that creates a stacking
// context (the content column's scroll fade did exactly that to the toast in
// tailor-inc/platform-planning#2040), whatever z-index it carries.

afterEach(() => {
  cleanup();
});

type Case = {
  name: string;
  ui: React.ReactNode;
  open?: (user: ReturnType<typeof userEvent.setup>) => Promise<void>;
  popup: () => Element | null;
};

const cases: Case[] = [
  {
    name: "Dialog",
    ui: (
      <Dialog.Root defaultOpen>
        <Dialog.Content>
          <Dialog.Title>Dialog</Dialog.Title>
        </Dialog.Content>
      </Dialog.Root>
    ),
    popup: () => document.querySelector('[data-slot="dialog-content"]'),
  },
  {
    name: "Sheet",
    ui: (
      <Sheet.Root defaultOpen>
        <Sheet.Content>
          <Sheet.Title>Sheet</Sheet.Title>
        </Sheet.Content>
      </Sheet.Root>
    ),
    popup: () => document.querySelector('[data-slot="sheet-content"]'),
  },
  {
    name: "Menu",
    ui: (
      <Menu.Root>
        <Menu.Trigger data-testid="trigger">Open</Menu.Trigger>
        <Menu.Content>
          <Menu.Item>Edit</Menu.Item>
        </Menu.Content>
      </Menu.Root>
    ),
    open: (user) => user.click(screen.getByTestId("trigger")),
    popup: () => screen.queryByText("Edit"),
  },
  {
    name: "Select",
    ui: (
      <Select.Root>
        <Select.Trigger data-testid="trigger">
          <Select.Value placeholder="Pick one" />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="a">Apple</Select.Item>
        </Select.Content>
      </Select.Root>
    ),
    open: (user) => user.click(screen.getByTestId("trigger")),
    popup: () => screen.queryByText("Apple"),
  },
  {
    name: "Combobox",
    ui: (
      <Combobox.Root<string>>
        <Combobox.Input data-testid="input" />
        <Combobox.Content>
          <Combobox.List>
            {["Apple", "Banana"].map((item) => (
              <Combobox.Item key={item} value={item}>
                {item}
              </Combobox.Item>
            ))}
          </Combobox.List>
        </Combobox.Content>
      </Combobox.Root>
    ),
    open: async (user) => {
      await user.click(screen.getByTestId("input"));
      await user.type(screen.getByTestId("input"), "a");
    },
    popup: () => screen.queryByText("Apple"),
  },
  {
    name: "Tooltip",
    ui: (
      <Tooltip.Root>
        <Tooltip.Trigger data-testid="trigger">Hover me</Tooltip.Trigger>
        <Tooltip.Content>Helpful information</Tooltip.Content>
      </Tooltip.Root>
    ),
    open: (user) => user.hover(screen.getByTestId("trigger")),
    popup: () => screen.queryByText("Helpful information"),
  },
  {
    name: "Toaster",
    ui: (
      <ThemeProvider defaultColorTheme="light">
        <Toaster />
      </ThemeProvider>
    ),
    open: async () => {
      toast("Saved");
    },
    popup: () => document.querySelector("[data-sonner-toast]"),
  },
];

describe.each(cases)("$name", ({ ui, open, popup }) => {
  it("renders its popup inside a portal that is a direct child of body", async () => {
    const user = userEvent.setup();
    // The page: a stacking context like the content column's scroll fade.
    const { container } = render(
      <div data-testid="page" style={{ maskImage: "linear-gradient(#000, #000)" }}>
        {ui}
      </div>,
    );
    await open?.(user);

    const element = await waitFor(() => {
      const el = popup();
      expect(el).not.toBeNull();
      return el as Element;
    });

    expect(container.contains(element)).toBe(false);

    let host: Element = element;
    while (host.parentElement && host.parentElement !== document.body) host = host.parentElement;
    expect(host.parentElement).toBe(document.body);
    expect(
      host.hasAttribute("data-base-ui-portal") ||
        host.querySelector("[data-sonner-toaster]") !== null,
    ).toBe(true);
  });
});
