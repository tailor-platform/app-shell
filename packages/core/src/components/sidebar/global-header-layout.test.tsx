import { render, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { GlobalHeaderLayout } from "./global-header-layout";
import { GlobalHeader } from "./global-header";
import { ContentContainer } from "./content-container";
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb";
import { AppShell } from "@/components/appshell";
import { defineModule } from "@/resource";
import { Home } from "lucide-react";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState({}, "", "/");
});

// The env default width lands in the tablet range; force desktop so the sidebar
// state (expanded/collapsed) is what drives the icon rail.
const stubDesktopViewport = () => {
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(1280);
  window.dispatchEvent(new Event("resize"));
};

const createModules = () => [
  defineModule({
    path: "dashboard",
    meta: { title: "Dashboard", icon: <Home /> },
    component: () => <div>Dashboard</div>,
    resources: [],
  }),
];

const renderLayout = (props: Parameters<typeof GlobalHeaderLayout>[0] = {}) => {
  window.history.pushState({}, "", "/dashboard");
  return render(
    <AppShell title="My App" modules={createModules()}>
      <GlobalHeaderLayout {...props} />
    </AppShell>,
  );
};

describe("GlobalHeaderLayout", () => {
  it("renders a global top bar with the app title and the route breadcrumb", async () => {
    stubDesktopViewport();
    renderLayout();

    await waitFor(() => {
      const header = document.querySelector("header");
      expect(header).not.toBeNull();
      expect(header!.textContent).toContain("My App");
      expect(header!.textContent).toContain("Dashboard");
    });
  });

  it("bakes hideHeader + iconRail into the default sidebar", async () => {
    stubDesktopViewport();
    renderLayout({ defaultOpen: false });

    await waitFor(() => {
      expect(document.querySelector('[data-slot="sidebar"]')).not.toBeNull();
    });

    // hideHeader → no sidebar header row; iconRail → collapses to the icon rail.
    expect(document.querySelector('[data-slot="sidebar-header"]')).toBeNull();
    const sidebar = document.querySelector('[data-slot="sidebar"]')!;
    expect(sidebar.getAttribute("data-collapsible")).toBe("icon");
  });

  it("exposes the namespaced building blocks", () => {
    expect(GlobalHeaderLayout.DefaultHeader).toBe(GlobalHeader);
    expect(GlobalHeaderLayout.ContentContainer).toBe(ContentContainer);
    expect(GlobalHeaderLayout.Breadcrumb).toBe(DynamicBreadcrumb);
  });
});
