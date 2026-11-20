import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Home } from "lucide-react";
import { AppShellTestingProvider } from "@/testing";
import { AppShell } from "@/index";
import { SidebarLayout } from "@/components/sidebar";
import { defineModule, defineResource } from "@/resource";
import { routerFactories } from "@/routing/router";

const modules = () => [
  defineModule({
    path: "orders",
    meta: { title: "Orders", icon: <Home /> },
    component: () => <div>Orders Root</div>,
    resources: [
      defineResource({
        path: ":id",
        meta: { title: "Order detail" },
        component: () => <div>Order detail page</div>,
      }),
    ],
  }),
];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("AppShell memory routing", () => {
  it("mounts at the provider's initialEntries location", async () => {
    render(
      <AppShellTestingProvider initialEntries={["/orders/A42"]}>
        <AppShell title="Test" modules={modules()}>
          <SidebarLayout />
        </AppShell>
      </AppShellTestingProvider>,
    );

    expect(await screen.findByText("Order detail page")).toBeDefined();
  });

  it("does not touch window.location", async () => {
    const before = window.location.pathname;

    render(
      <AppShellTestingProvider initialEntries={["/orders/A42"]}>
        <AppShell title="Test" modules={modules()}>
          <SidebarLayout />
        </AppShell>
      </AppShellTestingProvider>,
    );

    await screen.findByText("Order detail page");
    expect(window.location.pathname).toBe(before);
  });

  it("uses the nearest testing provider", async () => {
    render(
      <AppShellTestingProvider initialEntries={["/orders"]}>
        <AppShellTestingProvider initialEntries={["/orders/A42"]}>
          <AppShell title="Test" modules={modules()}>
            <SidebarLayout />
          </AppShell>
        </AppShellTestingProvider>
      </AppShellTestingProvider>,
    );

    expect(await screen.findByText("Order detail page")).toBeDefined();
  });

  it("uses memory routing for a shell configured with WithPages", async () => {
    const ConfiguredShell = AppShell.WithPages([
      { path: "/orders/:id", component: () => <div>Configured order page</div> },
    ]);

    render(
      <AppShellTestingProvider initialEntries={["/orders/A42"]}>
        <ConfiguredShell title="Test">
          <SidebarLayout />
        </ConfiguredShell>
      </AppShellTestingProvider>,
    );

    expect(await screen.findByText("Configured order page")).toBeDefined();
  });

  it("preserves its router when a provider rerenders with the same initialEntries", async () => {
    const createMemoryRouter = vi.spyOn(routerFactories, "createMemoryRouter");
    const initialEntries = ["/orders/A42"];
    const shell = (
      <AppShell title="Test" modules={modules()}>
        <SidebarLayout />
      </AppShell>
    );
    const { rerender } = render(
      <AppShellTestingProvider initialEntries={initialEntries}>
        {shell}
        <span>Before</span>
      </AppShellTestingProvider>,
    );

    await screen.findByText("Order detail page");
    const creations = createMemoryRouter.mock.calls.length;
    expect(creations).toBeGreaterThan(0);

    rerender(
      <AppShellTestingProvider initialEntries={initialEntries}>
        {shell}
        <span>After</span>
      </AppShellTestingProvider>,
    );

    expect(screen.getByText("Order detail page")).toBeDefined();
    expect(createMemoryRouter).toHaveBeenCalledTimes(creations);
  });

  it("ignores memory props without a testing provider, even from untyped callers", () => {
    const untyped = {
      memory: true,
      initialEntries: ["/orders/A42"],
      title: "Test",
      modules: modules(),
    } as never;

    render(
      <AppShell {...(untyped as object)}>
        <SidebarLayout />
      </AppShell>,
    );

    expect(screen.queryByText("Order detail page")).toBeNull();
  });
});
