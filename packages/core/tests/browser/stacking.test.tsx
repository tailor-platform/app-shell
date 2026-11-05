import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Dialog,
  Menu,
  Sheet,
  SidebarLayout,
  defineModule,
  useToast,
} from "@tailor-platform/app-shell";
import { AppShell } from "@tailor-platform/app-shell/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Regression for tailor-inc/platform-planning#2040 and the stacking rule in
// decisions/floating-ui-stacking.md. Rendered through the real AppShell so the
// Toaster sits where it ships (next to the route outlet) and the layout root
// carries `isolation: isolate`. `elementFromPoint` reports what the user sees.

let fireToast: ReturnType<typeof useToast>;

function Page() {
  fireToast = useToast();
  return (
    <div>
      <Dialog.Root>
        <Dialog.Trigger>Open A</Dialog.Trigger>
        <Dialog.Content data-testid="dialog-a">
          <Dialog.Title>Dialog A</Dialog.Title>
          <Dialog.Root>
            <Dialog.Trigger>Open B</Dialog.Trigger>
            <Dialog.Content data-testid="dialog-b">
              <Dialog.Title>Dialog B</Dialog.Title>
            </Dialog.Content>
          </Dialog.Root>
          <Menu.Root>
            <Menu.Trigger>Open menu</Menu.Trigger>
            <Menu.Content data-testid="menu">
              <Menu.Item>Edit</Menu.Item>
            </Menu.Content>
          </Menu.Root>
        </Dialog.Content>
      </Dialog.Root>
      <Sheet.Root>
        <Sheet.Trigger>Open sheet</Sheet.Trigger>
        <Sheet.Content data-testid="sheet">
          <Sheet.Title>Sheet</Sheet.Title>
          <Dialog.Root>
            <Dialog.Trigger>Open C</Dialog.Trigger>
            <Dialog.Content data-testid="dialog-c">
              <Dialog.Title>Dialog C</Dialog.Title>
            </Dialog.Content>
          </Dialog.Root>
        </Sheet.Content>
      </Sheet.Root>
      {/* Make the content column scroll. The scroll fade (a scroll-driven
          animation that sets mask-image) is inert without a scroll range, and
          the mask is the stacking context that trapped the toast in #2040. */}
      <div style={{ height: "300vh" }} />
    </div>
  );
}

const modules = () => [
  defineModule({ path: "home", meta: { title: "Home" }, component: Page, resources: [] }),
];

// The element painted at the centre of `el`.
const topAt = (el: Element) => {
  const r = el.getBoundingClientRect();
  return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
};

const toast = () => document.querySelector("[data-sonner-toast]") as HTMLElement | null;
const toaster = () => document.querySelector("[data-sonner-toaster]")?.closest("section") ?? null;

const expectToastOnTop = () =>
  waitFor(() => {
    const el = toast();
    expect(el).not.toBeNull();
    expect(topAt(el!)?.closest("[data-sonner-toast]")).toBe(el);
  });

const expectOnTop = (testId: string) =>
  waitFor(() => {
    const el = screen.getByTestId(testId);
    expect(topAt(el)?.closest(`[data-testid="${testId}"]`)).toBe(el);
  });

describe("floating UI stacking", () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(async () => {
    user = userEvent.setup();
    render(
      <AppShell memory initialEntries={["/home"]} title="Test" modules={modules()}>
        <SidebarLayout />
      </AppShell>,
    );
    await screen.findByText("Open A");
    // The trap from #2040 is in place: the column the Toaster mounts from has a mask.
    const column = document.querySelector("[data-appshell-scroll-container]")!;
    await waitFor(() => expect(getComputedStyle(column).maskImage).not.toBe("none"));
  });

  // Toasts live in Sonner's module-level store, not in the tree cleanup() unmounts.
  afterEach(() => {
    fireToast.dismiss();
  });

  it("portals the Toaster to body and keeps it readable while a dialog is open", async () => {
    await user.click(screen.getByText("Open A"));
    await expectOnTop("dialog-a");
    fireToast("Saved", { duration: Infinity });
    await expectToastOnTop();

    const section = toaster();
    expect(section?.parentElement).toBe(document.body);
    expect(section?.closest("[aria-hidden='true']")).toBeNull();
    expect(section?.closest("[inert]")).toBeNull();
  });

  it("shows the toast above a dialog opened on a dialog", async () => {
    await user.click(screen.getByText("Open A"));
    await user.click(await screen.findByText("Open B"));
    await expectOnTop("dialog-b");
    fireToast("Saved", { duration: Infinity });
    await expectToastOnTop();
    // The dialog B is still the top of the band: above A.
    await expectOnTop("dialog-b");
  });

  it("shows the toast above a dialog opened on a sheet", async () => {
    await user.click(screen.getByText("Open sheet"));
    await user.click(await screen.findByText("Open C"));
    await expectOnTop("dialog-c");
    fireToast("Saved", { duration: Infinity });
    await expectToastOnTop();
    await expectOnTop("dialog-c");
  });

  it("shows the toast above a popup opened inside a dialog", async () => {
    await user.click(screen.getByText("Open A"));
    fireToast("Saved", { duration: Infinity });
    await expectToastOnTop();
    await user.click(await screen.findByText("Open menu"));
    // The popup opened last is above the dialog that opened it.
    await expectOnTop("menu");
    await expectToastOnTop();
  });

  it("does not close the dialog when the toast is clicked", async () => {
    await user.click(screen.getByText("Open A"));
    fireToast("Saved", { duration: Infinity });
    await expectToastOnTop();
    await user.click(toast()!);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(screen.getByTestId("dialog-a").getAttribute("data-open")).not.toBeNull();
  });
});
