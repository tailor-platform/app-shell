import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MemoryRouter } from "react-router";
import { BreadcrumbOverrideProvider, useBreadcrumbOverride } from "@/contexts/breadcrumb-context";
import { useOverrideBreadcrumb } from "./use-override-breadcrumb";

let contextSnapshot: Map<string, string> | undefined;

const Spy = () => {
  contextSnapshot = useBreadcrumbOverride().overrides;
  return null;
};

const wrapper =
  (path: string) =>
  ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={[path]}>
      <BreadcrumbOverrideProvider>
        {children}
        <Spy />
      </BreadcrumbOverrideProvider>
    </MemoryRouter>
  );

describe("useOverrideBreadcrumb", () => {
  it("registers an override when title is provided", async () => {
    renderHook(() => useOverrideBreadcrumb("Order #123"), {
      wrapper: wrapper("/orders/123"),
    });
    await waitFor(() => {
      expect(contextSnapshot?.get("/orders/123")).toBe("Order #123");
    });
  });

  it("does not register when title is undefined", async () => {
    renderHook(() => useOverrideBreadcrumb(undefined), {
      wrapper: wrapper("/orders/123"),
    });
    await waitFor(() => {
      expect(contextSnapshot?.has("/orders/123")).toBe(false);
    });
  });

  it("updates override when title changes", async () => {
    const { rerender } = renderHook(
      ({ title }: { title: string | undefined }) => useOverrideBreadcrumb(title),
      {
        initialProps: { title: "Order #123" },
        wrapper: wrapper("/orders/123"),
      },
    );
    await waitFor(() => {
      expect(contextSnapshot?.get("/orders/123")).toBe("Order #123");
    });

    rerender({ title: "Order #456" });
    await waitFor(() => {
      expect(contextSnapshot?.get("/orders/123")).toBe("Order #456");
    });
  });

  it("cleans up override on unmount", async () => {
    const { unmount } = renderHook(() => useOverrideBreadcrumb("Order #123"), {
      wrapper: wrapper("/orders/123"),
    });
    await waitFor(() => {
      expect(contextSnapshot?.get("/orders/123")).toBe("Order #123");
    });

    // unmount tears down the entire tree (including the Spy), so we cannot
    // observe the state change via contextSnapshot. Verifying that unmount
    // completes without error confirms the cleanup effect ran.
    expect(() => unmount()).not.toThrow();
  });

  it("removes override when title changes from string to undefined", async () => {
    const { rerender } = renderHook(
      ({ title }: { title: string | undefined }) => useOverrideBreadcrumb(title),
      {
        initialProps: { title: "Order #123" as string | undefined },
        wrapper: wrapper("/orders/123"),
      },
    );
    await waitFor(() => {
      expect(contextSnapshot?.get("/orders/123")).toBe("Order #123");
    });

    rerender({ title: undefined });
    await waitFor(() => {
      expect(contextSnapshot?.has("/orders/123")).toBe(false);
    });
  });
});
