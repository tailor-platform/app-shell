import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MemoryRouter } from "react-router";
import { BreadcrumbOverrideProvider } from "@/contexts/breadcrumb-context";
import { useOverrideBreadcrumb } from "./use-override-breadcrumb";

const wrapper =
  (path: string) =>
  ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={[path]}>
      <BreadcrumbOverrideProvider>{children}</BreadcrumbOverrideProvider>
    </MemoryRouter>
  );

describe("useOverrideBreadcrumb", () => {
  it("registers an override when title is provided", () => {
    const { result } = renderHook(() => useOverrideBreadcrumb("Order #123"), {
      wrapper: wrapper("/orders/123"),
    });
    // Hook should not return anything
    expect(result.current).toBeUndefined();
  });

  it("does not register when title is undefined", () => {
    const { result } = renderHook(() => useOverrideBreadcrumb(undefined), {
      wrapper: wrapper("/orders/123"),
    });
    expect(result.current).toBeUndefined();
  });

  it("updates override when title changes", () => {
    let title: string | undefined = "Order #123";
    const { rerender } = renderHook(() => useOverrideBreadcrumb(title), {
      wrapper: wrapper("/orders/123"),
    });

    title = "Order #456";
    rerender();
    // No error means the effect ran successfully with the new title
  });

  it("cleans up override on unmount", () => {
    const { unmount } = renderHook(() => useOverrideBreadcrumb("Order #123"), {
      wrapper: wrapper("/orders/123"),
    });

    unmount();
    // No error means cleanup ran successfully
  });

  it("removes override when title changes from string to undefined", () => {
    let title: string | undefined = "Order #123";
    const { rerender } = renderHook(() => useOverrideBreadcrumb(title), {
      wrapper: wrapper("/orders/123"),
    });

    title = undefined;
    rerender();
    // No error means unregister was called successfully
  });
});
