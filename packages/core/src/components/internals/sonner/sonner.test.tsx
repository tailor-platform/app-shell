import { act, cleanup, render, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "@/contexts/theme-context";
import { Toaster } from "./sonner";

afterEach(() => {
  cleanup();
});

describe("Toaster", () => {
  it("renders through a portal to document.body with the toast z token", async () => {
    const { container } = render(
      <ThemeProvider defaultColorTheme="light">
        <div data-testid="column">
          <Toaster />
        </div>
      </ThemeProvider>,
    );
    await act(async () => {
      toast("Saved");
    });

    const toaster = await waitFor(() => {
      const el = document.querySelector("[data-sonner-toaster]");
      expect(el).not.toBeNull();
      return el as HTMLElement;
    });
    // Nothing of the Toaster stays in the column it is mounted from.
    expect(container.querySelector("[data-sonner-toaster]")).toBeNull();
    // Sonner wraps the list in a <section>; that section is a direct child of body.
    expect(toaster.closest("section")?.parentElement).toBe(document.body);
    expect(toaster.style.zIndex).toBe("var(--z-toast)");
    expect(document.body.querySelector("[data-sonner-toast]")?.textContent).toContain("Saved");
  });
});
