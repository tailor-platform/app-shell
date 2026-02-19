import { describe, it, expect } from "vitest";
import { createTypedPaths } from "./typed-paths";

// ============================================
// createTypedPaths Tests
// ============================================

describe("createTypedPaths", () => {
  // Define test routes
  type TestRouteParams = {
    "/": Record<string, never>;
    "/dashboard": Record<string, never>;
    "/orders": Record<string, never>;
    "/orders/:id": { id: string };
    "/orders/:orderId/items/:itemId": { orderId: string; itemId: string };
    "/docs/*slug": { slug: string };
  };

  const paths = createTypedPaths<TestRouteParams>();

  describe("static routes", () => {
    it("returns root path", () => {
      expect(paths.for("/")).toBe("/");
    });

    it("returns static path unchanged", () => {
      expect(paths.for("/dashboard")).toBe("/dashboard");
    });

    it("returns path with multiple static segments", () => {
      expect(paths.for("/orders")).toBe("/orders");
    });
  });

  describe("dynamic routes", () => {
    it("replaces single dynamic parameter", () => {
      expect(paths.for("/orders/:id", { id: "123" })).toBe("/orders/123");
    });

    it("replaces multiple dynamic parameters", () => {
      expect(
        paths.for("/orders/:orderId/items/:itemId", {
          orderId: "order-1",
          itemId: "item-2",
        }),
      ).toBe("/orders/order-1/items/item-2");
    });

    it("URL-encodes parameter values", () => {
      expect(paths.for("/orders/:id", { id: "hello world" })).toBe(
        "/orders/hello%20world",
      );
    });

    it("handles special characters in parameters", () => {
      expect(paths.for("/orders/:id", { id: "a/b/c" })).toBe(
        "/orders/a%2Fb%2Fc",
      );
    });
  });

  describe("catch-all routes", () => {
    it("replaces catch-all parameter", () => {
      expect(paths.for("/docs/*slug", { slug: "getting-started" })).toBe(
        "/docs/getting-started",
      );
    });

    it("URL-encodes catch-all value", () => {
      expect(paths.for("/docs/*slug", { slug: "a/b/c" })).toBe(
        "/docs/a%2Fb%2Fc",
      );
    });
  });

  describe("query string passthrough", () => {
    it("preserves query string on static route", () => {
      expect(paths.for("/dashboard?tab=overview")).toBe(
        "/dashboard?tab=overview",
      );
    });

    it("preserves query string on dynamic route", () => {
      expect(paths.for("/orders/:id?tab=details", { id: "123" })).toBe(
        "/orders/123?tab=details",
      );
    });

    it("preserves complex query string", () => {
      expect(
        paths.for("/orders/:id?tab=details&sort=asc&page=1", { id: "456" }),
      ).toBe("/orders/456?tab=details&sort=asc&page=1");
    });
  });
});
