import { render, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { useEffect, type RefObject } from "react";
import { SidebarLayout } from "@/components/sidebar/sidebar-layout";
import { AppShell } from "@/components/appshell";
import { defineModule } from "@/resource";
import { Home } from "lucide-react";
import { useAppShellScrollContainer } from "./scroll-container-context";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState({}, "", "/");
});

// Captures the ref returned by the hook so assertions can inspect its `current`
// after the layout has mounted (refs populate during commit, before effects).
let captured: RefObject<HTMLElement | null> | null = null;

function Probe() {
  const ref = useAppShellScrollContainer();
  captured = ref;
  return <div data-testid="probe">probe</div>;
}

const renderInsideLayout = () => {
  captured = null;
  window.history.pushState({}, "", "/dashboard");
  return render(
    <AppShell
      title="Test"
      modules={[
        defineModule({
          path: "dashboard",
          meta: { title: "Dashboard", icon: <Home /> },
          component: () => <Probe />,
          resources: [],
        }),
      ]}
    >
      <SidebarLayout />
    </AppShell>,
  );
};

describe("useAppShellScrollContainer", () => {
  it("marks the content scroll region with data-appshell-scroll-container", async () => {
    renderInsideLayout();
    await waitFor(() => {
      expect(document.querySelector("[data-appshell-scroll-container]")).not.toBeNull();
    });
  });

  it("resolves to the content scroll region element for pages inside the layout", async () => {
    renderInsideLayout();
    // Assert inside waitFor: StrictMode's mount→unmount→remount detaches and
    // reattaches the ref, so `current` is briefly null right after first paint.
    await waitFor(() => {
      const el = document.querySelector("[data-appshell-scroll-container]");
      expect(el).not.toBeNull();
      expect(captured?.current).toBe(el);
    });
  });

  it("exposes an element that dispatches scroll events to listeners", async () => {
    renderInsideLayout();
    await waitFor(() =>
      expect(document.querySelector("[data-appshell-scroll-container]")).not.toBeNull(),
    );

    // Read the element from the DOM (stable, in-document) rather than through
    // the ref, whose `current` toggles during the StrictMode remount.
    const el = document.querySelector("[data-appshell-scroll-container]")!;
    const onScroll = vi.fn();
    el.addEventListener("scroll", onScroll);
    el.dispatchEvent(new Event("scroll"));
    expect(onScroll).toHaveBeenCalledTimes(1);
    el.removeEventListener("scroll", onScroll);
  });

  it("returns a ref whose current is null when used outside a SidebarLayout", async () => {
    captured = null;
    render(<Probe />);
    await waitFor(() => expect(document.querySelector('[data-testid="probe"]')).not.toBeNull());

    expect(captured).not.toBeNull();
    expect(captured!.current).toBeNull();
  });
});

// Exercises the documented consumer pattern end-to-end: subscribe to the
// container's scroll events from a page, the way omakase/sansei would after
// migrating off `window`.
describe("useAppShellScrollContainer (consumer subscription pattern)", () => {
  it("lets a page attach a scroll listener via an effect", async () => {
    const onScroll = vi.fn();
    captured = null;
    window.history.pushState({}, "", "/dashboard");

    function Subscriber() {
      const scrollRef = useAppShellScrollContainer();
      useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        el.addEventListener("scroll", onScroll, { passive: true });
        return () => el.removeEventListener("scroll", onScroll);
      }, [scrollRef]);
      return <div data-testid="subscriber">sub</div>;
    }

    render(
      <AppShell
        title="Test"
        modules={[
          defineModule({
            path: "dashboard",
            meta: { title: "Dashboard", icon: <Home /> },
            component: () => <Subscriber />,
            resources: [],
          }),
        ]}
      >
        <SidebarLayout />
      </AppShell>,
    );

    await waitFor(() =>
      expect(document.querySelector('[data-testid="subscriber"]')).not.toBeNull(),
    );

    const el = document.querySelector("[data-appshell-scroll-container]")!;
    el.dispatchEvent(new Event("scroll"));
    expect(onScroll).toHaveBeenCalledTimes(1);
  });
});
