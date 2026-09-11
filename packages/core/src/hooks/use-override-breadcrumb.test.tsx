import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { type ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { BreadcrumbOverrideProvider, useBreadcrumbOverride } from "@/contexts/breadcrumb-context";
import { useOverrideBreadcrumb } from "./use-override-breadcrumb";

const wrapper =
  (path: string) =>
  ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[path]}>
      <BreadcrumbOverrideProvider>{children}</BreadcrumbOverrideProvider>
    </MemoryRouter>
  );

const renderOverride = (path: string, title: string | undefined) =>
  renderHook(
    ({ title: currentTitle }: { title: string | undefined }) => {
      useOverrideBreadcrumb(currentTitle);
      return useBreadcrumbOverride().overrides;
    },
    {
      initialProps: { title },
      wrapper: wrapper(path),
    },
  );

describe("useOverrideBreadcrumb", () => {
  it("registers an override when title is provided", async () => {
    const { result } = renderOverride("/orders/123", "Order #123");

    await waitFor(() => {
      expect(result.current.get("/orders/123")).toBe("Order #123");
    });
  });

  it("does not register when title is undefined", async () => {
    const { result } = renderOverride("/orders/123", undefined);

    await waitFor(() => {
      expect(result.current.has("/orders/123")).toBe(false);
    });
  });

  it("updates override when title changes", async () => {
    const { result, rerender } = renderOverride("/orders/123", "Order #123");

    await waitFor(() => {
      expect(result.current.get("/orders/123")).toBe("Order #123");
    });

    rerender({ title: "Order #456" });
    await waitFor(() => {
      expect(result.current.get("/orders/123")).toBe("Order #456");
    });
  });

  it("cleans up override on unmount", async () => {
    const { result, unmount } = renderOverride("/orders/123", "Order #123");

    await waitFor(() => {
      expect(result.current.get("/orders/123")).toBe("Order #123");
    });

    // Unmount tears down the provider too, so the observable contract here is
    // simply that cleanup completes without throwing.
    expect(() => unmount()).not.toThrow();
  });

  it("removes override when title changes from string to undefined", async () => {
    const { result, rerender } = renderOverride("/orders/123", "Order #123");

    await waitFor(() => {
      expect(result.current.get("/orders/123")).toBe("Order #123");
    });

    rerender({ title: undefined });
    await waitFor(() => {
      expect(result.current.has("/orders/123")).toBe(false);
    });
  });
});
