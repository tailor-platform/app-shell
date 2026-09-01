import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Home } from "lucide-react";
import { AppShell } from "@/testing";
import { AppShell as PublicAppShell } from "@/index";
import { SidebarLayout } from "@/components/sidebar";
import { defineModule, defineResource } from "@/resource";

// `memory` lets a test mount at a known URL without touching
// window.location. Reachable only from the /testing entry.

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
});

describe("AppShell memory routing", () => {
  it("mounts at the given initialEntries location", async () => {
    render(
      <AppShell memory initialEntries={["/orders/A42"]} title="Test" modules={modules()}>
        <SidebarLayout />
      </AppShell>,
    );

    expect(await screen.findByText("Order detail page")).toBeDefined();
  });

  it("does not touch window.location", async () => {
    const before = window.location.pathname;

    render(
      <AppShell memory initialEntries={["/orders/A42"]} title="Test" modules={modules()}>
        <SidebarLayout />
      </AppShell>,
    );

    await screen.findByText("Order detail page");
    expect(window.location.pathname).toBe(before);
  });

  it("ignores memory on the production component, even from untyped callers", async () => {
    // The type already rejects this; the pin is what holds for JS callers and
    // `any` spreads, where it does not apply.
    const untyped = {
      memory: true,
      initialEntries: ["/orders/A42"],
      title: "Test",
      modules: modules(),
    } as never;

    render(
      <PublicAppShell {...(untyped as object)}>
        <SidebarLayout />
      </PublicAppShell>,
    );

    // Browser routing won: jsdom's location is "/", so the order page never matches.
    expect(screen.queryByText("Order detail page")).toBeNull();
  });
});
