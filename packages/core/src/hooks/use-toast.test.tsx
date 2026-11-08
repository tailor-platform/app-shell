import { act, cleanup, render, renderHook, waitFor } from "@testing-library/react";
import { type ToastT, toast as sonnerToast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/contexts/theme-context";
import { Toaster } from "@/components/internals/sonner";
import { useToast } from "./use-toast";

const renderToaster = () =>
  render(
    <ThemeProvider defaultColorTheme="light">
      <Toaster />
    </ThemeProvider>,
  );

const activeToast = (title: string) =>
  sonnerToast.getToasts().find((t): t is ToastT => "title" in t && t.title === title);

const closeButtonOf = (title: string) =>
  Array.from(document.querySelectorAll("[data-sonner-toast]"))
    .find((el) => el.textContent?.includes(title))
    ?.querySelector("[data-close-button]");

let toast: ReturnType<typeof useToast>;

beforeEach(() => {
  toast = renderHook(() => useToast()).result.current;
});

afterEach(() => {
  sonnerToast.dismiss();
  cleanup();
  vi.useRealTimers();
});

describe("useToast", () => {
  it("keeps the sonner API shape", () => {
    expect(typeof toast).toBe("function");
    for (const key of Object.keys(sonnerToast)) {
      expect(toast).toHaveProperty(key);
    }
  });

  it("gives error toasts a close button and no auto-dismiss", async () => {
    renderToaster();
    await act(async () => {
      toast.error("Failed to save");
    });
    expect(activeToast("Failed to save")).toMatchObject({ duration: Infinity, closeButton: true });
    await waitFor(() => {
      expect(closeButtonOf("Failed to save")).not.toBeNull();
    });
  });

  it("gives any toast with an action the same defaults", async () => {
    renderToaster();
    await act(async () => {
      toast("Order archived", { action: { label: "Undo", onClick: () => {} } });
      toast.success("Order approved", { action: { label: "View", onClick: () => {} } });
    });
    expect(activeToast("Order archived")).toMatchObject({ duration: Infinity, closeButton: true });
    expect(activeToast("Order approved")).toMatchObject({ duration: Infinity, closeButton: true });
  });

  it("lets the caller's duration and closeButton win", async () => {
    await act(async () => {
      toast.error("Retrying", { duration: 1000 });
      toast.error("Quiet", { closeButton: false });
      toast.error("Forwarded", { duration: undefined, closeButton: undefined });
    });
    expect(activeToast("Retrying")).toMatchObject({ duration: 1000, closeButton: true });
    expect(activeToast("Quiet")).toMatchObject({ duration: Infinity, closeButton: false });
    expect(activeToast("Forwarded")).toMatchObject({ duration: Infinity, closeButton: true });
  });

  it("leaves toasts without an action on Sonner's defaults", async () => {
    renderToaster();
    await act(async () => {
      toast.success("Saved");
      toast("Plain");
      toast.info("FYI", { description: "Details" });
    });
    for (const title of ["Saved", "Plain", "FYI"]) {
      const t = activeToast(title);
      expect(t).toBeDefined();
      expect(t).not.toHaveProperty("duration");
      expect(t).not.toHaveProperty("closeButton");
    }
    await waitFor(() => {
      expect(closeButtonOf("Saved")).toBeNull();
    });
  });

  it("resets the sticky defaults when a later call updates the toast by id", async () => {
    vi.useFakeTimers();
    renderToaster();
    await act(async () => {
      toast.success("Saved", { id: toast.error("Save failed") });
      toast.success("Kept", { id: toast.error("Other failure"), duration: 8000 });
    });
    expect(activeToast("Saved")).toMatchObject({ type: "success" });
    expect(activeToast("Saved")?.duration).toBeUndefined();
    expect(activeToast("Saved")?.closeButton).toBeUndefined();
    expect(activeToast("Kept")).toMatchObject({ type: "success", duration: 8000 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(document.body.textContent).not.toContain("Saved");
    expect(document.body.textContent).toContain("Kept");
  });

  it("only the error toast outlives Sonner's 4 s timer", async () => {
    vi.useFakeTimers();
    renderToaster();
    await act(async () => {
      toast.success("Saved");
      toast.error("Failed to save");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(document.body.textContent).not.toContain("Saved");
    expect(document.body.textContent).toContain("Failed to save");
  });

  it("gives the error state of toast.promise the same defaults", async () => {
    const failing = toast.promise(Promise.reject(new Error("boom")), {
      loading: "Saving",
      success: "Saved",
      error: "Failed to save",
    });
    await expect(failing.unwrap()).rejects.toThrow("boom");
    await waitFor(() => {
      expect(activeToast("Failed to save")).toMatchObject({
        type: "error",
        duration: Infinity,
        closeButton: true,
      });
    });
  });

  it("lets a promise call's own options win over the error defaults", async () => {
    const fromFunction = toast.promise(Promise.reject(new Error("boom")), {
      loading: "Saving A",
      error: (error: Error) => ({ message: `A: ${error.message}`, duration: 1500 }),
    });
    const fromCall = toast.promise(Promise.reject(new Error("boom")), {
      loading: "Saving B",
      error: "B failed",
      duration: 2500,
      closeButton: false,
    });
    await expect(fromFunction.unwrap()).rejects.toThrow();
    await expect(fromCall.unwrap()).rejects.toThrow();
    await waitFor(() => {
      expect(activeToast("A: boom")).toMatchObject({
        type: "error",
        duration: 1500,
        closeButton: true,
      });
      expect(activeToast("B failed")).toMatchObject({
        type: "error",
        duration: 2500,
        closeButton: false,
      });
    });
  });

  it("leaves the success state of toast.promise alone", async () => {
    const ok = toast.promise(Promise.resolve(1), {
      loading: "Saving",
      success: "Saved",
      error: "Failed",
    });
    await ok.unwrap();
    await waitFor(() => {
      const t = activeToast("Saved");
      expect(t).toMatchObject({ type: "success" });
      expect(t).not.toHaveProperty("closeButton");
    });
  });
});
