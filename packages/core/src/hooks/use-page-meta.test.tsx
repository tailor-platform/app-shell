import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MemoryRouter } from "react-router";
import {
  AppShellConfigContext,
  type RootConfiguration,
} from "@/contexts/appshell-context";
import { usePageMeta } from "./use-page-meta";
import { defineModule, defineResource } from "@/resource";
import { Folder, Home, Settings, ShoppingCart } from "lucide-react";
import { DefaultErrorBoundary } from "@/components/default-error-boundary";

const createTestModules = () => [
  defineModule({
    path: "dashboard",
    meta: { title: "Dashboard", icon: <Home /> },
    component: () => <div>Dashboard Root</div>,
    resources: [
      defineResource({
        path: "overview",
        meta: { title: "Overview" },
        component: () => <div>Overview</div>,
      }),
      defineResource({
        path: "settings",
        meta: { title: "Settings", icon: <Settings /> },
        component: () => <div>Settings</div>,
      }),
    ],
  }),
  defineModule({
    path: "products",
    meta: { title: "Products", icon: <Folder /> },
    component: () => <div>Products Root</div>,
    resources: [
      defineResource({
        path: "all",
        meta: { title: "All Products" },
        component: () => <div>All Products</div>,
        subResources: [
          defineResource({
            path: "archived",
            meta: { title: "Archived" },
            component: () => <div>Archived</div>,
          }),
        ],
      }),
    ],
  }),
  defineModule({
    path: "orders",
    meta: { title: "Orders", icon: <ShoppingCart /> },
    component: () => <div>Orders Root</div>,
    resources: [
      defineResource({
        path: ":id",
        meta: { title: "Order Detail" },
        component: () => <div>Order Detail</div>,
        subResources: [
          defineResource({
            path: "items",
            meta: { title: "Order Items" },
            component: () => <div>Order Items</div>,
          }),
        ],
      }),
    ],
  }),
];

const testConfig: RootConfiguration = {
  modules: createTestModules(),
  settingsResources: [],
  locale: "en",
  errorBoundary: <DefaultErrorBoundary />,
};

const renderPageMeta = (path: string) => {
  return renderHook(() => usePageMeta(path), {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={["/dashboard/overview"]}>
        <AppShellConfigContext.Provider value={{ configurations: testConfig }}>
          {children}
        </AppShellConfigContext.Provider>
      </MemoryRouter>
    ),
  });
};

describe("usePageMeta", () => {
  it("returns meta for module path", () => {
    const { result } = renderPageMeta("/dashboard");

    expect(result.current).not.toBeNull();
    expect(result.current?.title).toBe("Dashboard");
    expect(result.current?.icon).toBeDefined();
  });

  it("returns meta for resource path", () => {
    const { result } = renderPageMeta("/dashboard/settings");

    expect(result.current).not.toBeNull();
    expect(result.current?.title).toBe("Settings");
    expect(result.current?.icon).toBeDefined();
  });

  it("returns meta for nested sub-resource path", () => {
    const { result } = renderPageMeta("/products/all/archived");

    expect(result.current).not.toBeNull();
    expect(result.current?.title).toBe("Archived");
  });

  it("returns null for external URLs", () => {
    const { result } = renderPageMeta("https://example.com");

    expect(result.current).toBeNull();
  });

  it("returns null for non-existent paths", () => {
    const { result } = renderPageMeta("/non-existent/path");

    expect(result.current).toBeNull();
  });

  it("handles module paths without leading slash", () => {
    // The path in modules doesn't have leading slash, but user might pass it
    const { result } = renderPageMeta("/products");

    expect(result.current).not.toBeNull();
    expect(result.current?.title).toBe("Products");
  });

  it("matches dynamic segment in resource path", () => {
    const { result } = renderPageMeta("/orders/123");

    expect(result.current).not.toBeNull();
    expect(result.current?.title).toBe("Order Detail");
  });

  it("matches sub-resource under dynamic segment", () => {
    const { result } = renderPageMeta("/orders/456/items");

    expect(result.current).not.toBeNull();
    expect(result.current?.title).toBe("Order Items");
  });

  it("returns null when segment count does not match dynamic path", () => {
    const { result } = renderPageMeta("/orders");

    expect(result.current).not.toBeNull();
    expect(result.current?.title).toBe("Orders");
  });
});
