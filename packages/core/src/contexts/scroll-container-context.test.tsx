import { renderHook, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { useEffect, type ReactNode } from "react";
import { SidebarLayout } from "@/components/sidebar";
import { AppShell } from "@/components/appshell";
import { defineModule } from "@/resource";
import { Home } from "lucide-react";
import { useAppShellScrollContainer } from "./scroll-container-context";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState({}, "", "/");
});

const insideLayoutWrapper =
  (path = "/dashboard") =>
  ({ children }: { children: ReactNode }) => {
    window.history.pushState({}, "", path);
    return (
      <AppShell
        title="Test"
        modules={[
          defineModule({
            path: path.replace(/^\//, ""),
            meta: { title: "Dashboard", icon: <Home /> },
            component: () => <>{children}</>,
            resources: [],
          }),
        ]}
      >
        <SidebarLayout />
      </AppShell>
    );
  };

describe("useAppShellScrollContainer", () => {
  it("marks the content scroll region with data-appshell-scroll-container", async () => {
    renderHook(() => useAppShellScrollContainer(), {
      wrapper: insideLayoutWrapper(),
    });

    await waitFor(() => {
      expect(document.querySelector("[data-appshell-scroll-container]")).not.toBeNull();
    });
  });

  it("resolves to the content scroll region element for pages inside the layout", async () => {
    const { result } = renderHook(() => useAppShellScrollContainer(), {
      wrapper: insideLayoutWrapper(),
    });

    // Assert inside waitFor: StrictMode's mount→unmount→remount detaches and
    // reattaches the ref, so `current` is briefly null right after first paint.
    await waitFor(() => {
      const el = document.querySelector("[data-appshell-scroll-container]");
      expect(el).not.toBeNull();
      expect(result.current.current).toBe(el);
    });
  });

  it("exposes an element that dispatches scroll events to listeners", async () => {
    renderHook(() => useAppShellScrollContainer(), {
      wrapper: insideLayoutWrapper(),
    });

    await waitFor(() =>
      expect(document.querySelector("[data-appshell-scroll-container]")).not.toBeNull(),
    );

    const el = document.querySelector("[data-appshell-scroll-container]")!;
    const onScroll = vi.fn();
    el.addEventListener("scroll", onScroll);
    el.dispatchEvent(new Event("scroll"));
    expect(onScroll).toHaveBeenCalledTimes(1);
    el.removeEventListener("scroll", onScroll);
  });

  it("returns a ref whose current is null when used outside a SidebarLayout", () => {
    const { result } = renderHook(() => useAppShellScrollContainer());

    expect(result.current.current).toBeNull();
  });
});

// Exercises the documented consumer pattern end-to-end: subscribe to the
// container's scroll events from a page, the way omakase/sansei would after
// migrating off `window`.
describe("useAppShellScrollContainer (consumer subscription pattern)", () => {
  it("lets a page attach a scroll listener via an effect", async () => {
    const onScroll = vi.fn();
    const { result } = renderHook(
      () => {
        const scrollRef = useAppShellScrollContainer();
        useEffect(() => {
          const el = scrollRef.current;
          if (!el) return;
          el.addEventListener("scroll", onScroll, { passive: true });
          return () => el.removeEventListener("scroll", onScroll);
        }, [scrollRef]);
        return scrollRef;
      },
      { wrapper: insideLayoutWrapper() },
    );

    await waitFor(() => expect(result.current.current).not.toBeNull());

    result.current.current!.dispatchEvent(new Event("scroll"));
    expect(onScroll).toHaveBeenCalledTimes(1);
  });
});
