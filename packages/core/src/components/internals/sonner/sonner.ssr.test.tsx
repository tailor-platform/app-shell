// @vitest-environment node
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ThemeProvider } from "@/contexts/theme-context";
import { Toaster } from "./sonner";

describe("Toaster on the server", () => {
  it("renders nothing and does not touch document", () => {
    expect(typeof document).toBe("undefined");
    const html = renderToString(
      <ThemeProvider defaultColorTheme="light">
        <Toaster />
      </ThemeProvider>,
    );
    expect(html).toBe("");
  });
});
